import {Env,HttpError,json,phone,readBody,text} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {Flow,Step,normalizeReply,parseFlow} from '../../../shared/bot';
import {User,audit,numbersFor} from './users';
// Bot flows: admins build them; users see a customer's bot state in the messages table and can turn the bot off or on
// for a customer of their numbers.
const STEP_ID = /^s[0-9]{1,3}$/;
function steps(value: unknown, fields: Set<string>): Step[] {
 if (!Array.isArray(value) || !value.length || value.length > 30) throw new HttpError(400,'A flow has 1 to 30 steps');
 const ids = new Set<string>(); for (const s of value) { const id = (s as Step)?.id; if (typeof id !== 'string' || !STEP_ID.test(id) || ids.has(id)) throw new HttpError(400,'Invalid step id'); ids.add(id); }
 const next = (v: unknown) => { if (v === undefined || v === null || v === '') return ''; if (typeof v !== 'string' || !ids.has(v)) throw new HttpError(400,'A step points to a step that does not exist'); return v; };
 const field = (v: unknown) => { if (v === undefined || v === null || v === '') return ''; if (typeof v !== 'string' || !fields.has(v)) throw new HttpError(400,'Unknown contact field'); return v; };
 return value.map((raw, i) => {
  const s = raw as Record<string,unknown>; const n = 'Step '+(i+1);
  const t = text(typeof s.text === 'string' ? s.text.trim() : s.text,n+' text',1000); const type = s.type;
  if (type === 'end') return {id:s.id as string,text:t,type};
  if (type === 'text') return {id:s.id as string,text:t,type,next:next(s.next),field:field(s.field)};
  if (type !== 'options') throw new HttpError(400,n+': invalid type');
  if (!Array.isArray(s.options) || !s.options.length || s.options.length > 20) throw new HttpError(400,n+': 1 to 20 answer options');
  const seen = new Set<string>();
  const options = s.options.map(o => { const v = o as Record<string,unknown>; const reply = text(typeof v.reply === 'string' ? v.reply.trim() : v.reply,n+' answer',60);
   for (const r of reply.split(',').map(normalizeReply).filter(Boolean)) { if (seen.has(r)) throw new HttpError(400,n+': the answer "'+r+'" appears twice'); seen.add(r); }
   const meaning = typeof v.meaning === 'string' ? v.meaning.trim().slice(0,60) : ''; return {reply,meaning,next:next(v.next)}; });
  return {id:s.id as string,text:t,type,options,field:field(s.field)};
 });
}
async function canUse(env: Env, user: User, system: string): Promise<boolean> { return (await numbersFor(env,user)).some(n => n.number === system); }
// GET /api/bot/info?id=<message id>: the customer's bot state for that message's conversation, and the bot answer it gave.
export async function botInfo(url: URL, env: Env, user: User): Promise<Response> {
 const id = Number(url.searchParams.get('id')); if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid id');
 const m = await env.DB.prepare('SELECT system_number,peer_number FROM messages WHERE id=?').bind(id).first<{system_number:string;peer_number:string}>();
 if (!m || !await canUse(env,user,m.system_number)) throw new HttpError(404,'Message not found');
 const [blocked,answer,conv] = await Promise.all([
  env.DB.prepare('SELECT created_by,created_at FROM bot_blocks WHERE system_number=? AND peer_number=?').bind(m.system_number,m.peer_number).first(),
  env.DB.prepare('SELECT a.question,a.answer,a.meaning,f.name AS flow FROM bot_answers a LEFT JOIN flows f ON f.id=a.flow_id WHERE a.message_id=?').bind(id).first(),
  env.DB.prepare('SELECT f.name AS flow,c.step,c.expires_at FROM conversations c JOIN flows f ON f.id=c.flow_id WHERE c.system_number=? AND c.peer_number=? AND c.expires_at>?').bind(m.system_number,m.peer_number,Date.now()).first(),
 ]);
 return json({blocked,answer,conversation:conv});
}
// POST /api/bot/block {system_number, peer_number, blocked}: turns the bot off (ending any conversation) or back on.
export async function botBlock(request: Request, env: Env, user: User): Promise<Response> {
 const body = await readBody(request); const system = phone(body.system_number); const peer = phone(body.peer_number);
 if (typeof body.blocked !== 'boolean') throw new HttpError(400,'blocked must be true or false'); if (!await canUse(env,user,system)) throw new HttpError(403,'This number is not assigned to you');
 await env.DB.batch(body.blocked
  ? [env.DB.prepare('INSERT INTO bot_blocks (system_number,peer_number,created_at,created_by) VALUES (?,?,?,?) ON CONFLICT DO NOTHING').bind(system,peer,Date.now(),user.email),env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number=?').bind(system,peer),audit(env,user.email,'bot.block',peer,{system_number:system})]
  : [env.DB.prepare('DELETE FROM bot_blocks WHERE system_number=? AND peer_number=?').bind(system,peer),audit(env,user.email,'bot.unblock',peer,{system_number:system})]);
 return json({ok:true});
}
export async function flows(request: Request, path: string, url: URL, env: Env, user: User): Promise<Response> {
 if (request.method === 'GET') {
  if (path === 'flows/answers') { const id = Number(url.searchParams.get('id')); if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid flow');
   return json({answers:(await env.DB.prepare('SELECT a.id,a.peer_number,a.step,a.question,a.answer,a.meaning,a.at,c.data AS contact FROM bot_answers a LEFT JOIN contacts c ON c.number=a.peer_number WHERE a.flow_id=? ORDER BY a.id DESC LIMIT 5000').bind(id).all<{contact:string|null}>()).results.map(r => ({...r,contact:r.contact?JSON.parse(r.contact):null}))}); }
  const rows = await env.DB.prepare('SELECT f.*,(SELECT COUNT(*) FROM conversations c WHERE c.flow_id=f.id AND c.expires_at>?) AS live,(SELECT COUNT(*) FROM bot_answers a WHERE a.flow_id=f.id) AS answers FROM flows f ORDER BY f.name,f.id').bind(Date.now()).all<Omit<Flow,'steps'> & {steps:string}>();
  return json({flows:rows.results.map(parseFlow)});
 }
 const body = await readBody(request, 131072);
 if (path === 'flows/save') {
  const fields = new Set((await loadSettings(env.DB)).contact_fields.map(f => f.id));
  const name = text(typeof body.name === 'string' ? body.name.trim() : body.name,'name',60); const system = phone(body.system_number);
  const trigger = body.trigger; if (trigger !== 'any' && trigger !== 'keyword' && trigger !== 'send') throw new HttpError(400,'Invalid trigger');
  const keyword = trigger === 'keyword' ? normalizeReply(text(body.keyword,'keyword',30)) : null; if (trigger === 'keyword' && !keyword) throw new HttpError(400,'Enter a keyword');
  const list = steps(body.steps,fields); const fallback = typeof body.fallback === 'string' ? body.fallback.trim().slice(0,300) : '';
  const expire = body.expire_hours; if (!Number.isInteger(expire) || (expire as number) < 1 || (expire as number) > 720) throw new HttpError(400,'Expiry must be 1 to 720 hours');
  if (typeof body.active !== 'boolean') throw new HttpError(400,'active must be true or false');
  if (!await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=?').bind(system).first()) throw new HttpError(400,'Unknown system number');
  const id = body.id === undefined || body.id === null ? null : body.id; if (id !== null && !Number.isSafeInteger(id)) throw new HttpError(400,'Invalid flow');
  // Only one active flow may answer any message on a number, and a keyword starts one flow only.
  if (body.active) { const others = (await env.DB.prepare('SELECT id,name,trigger,keyword FROM flows WHERE system_number=? AND active=1 AND id!=?').bind(system,id ?? 0).all<{name:string;trigger:string;keyword:string|null}>()).results;
   const clash = others.find(o => (trigger === 'any' && o.trigger === 'any') || (trigger === 'keyword' && o.trigger === 'keyword' && o.keyword === keyword));
   if (clash) throw new HttpError(409,'The active flow "'+clash.name+'" already '+(trigger === 'any' ? 'answers every message on this number' : 'uses this keyword')); }
  const now = Date.now(); const values = [name,system,trigger,keyword,JSON.stringify(list),fallback,expire,body.active?1:0,now];
  let saved: number;
  if (id === null) saved = (await env.DB.prepare('INSERT INTO flows (name,system_number,trigger,keyword,steps,fallback,expire_hours,active,updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(...values,now).first<{id:number}>())!.id;
  else { const r = await env.DB.prepare('UPDATE flows SET name=?,system_number=?,trigger=?,keyword=?,steps=?,fallback=?,expire_hours=?,active=?,updated_at=? WHERE id=?').bind(...values,id).run(); if (!r.meta.changes) throw new HttpError(404,'Flow not found'); saved = id as number; }
  // Conversations waiting on a step that no longer exists are ended.
  await env.DB.batch([env.DB.prepare('DELETE FROM conversations WHERE flow_id=? AND step NOT IN (SELECT json_extract(value,\'$.id\') FROM json_each(?))').bind(saved,JSON.stringify(list)),audit(env,user.email,'flow.save',name,{id:saved,system_number:system,trigger,steps:list.length,active:!!body.active})]);
  return json({ok:true,id:saved});
 }
 if (path === 'flows/delete') {
  const id = body.id; if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid flow'); const f = await env.DB.prepare('SELECT name FROM flows WHERE id=?').bind(id).first<{name:string}>(); if (!f) throw new HttpError(404,'Flow not found');
  await env.DB.batch([env.DB.prepare('DELETE FROM conversations WHERE flow_id=?').bind(id),env.DB.prepare('DELETE FROM bot_answers WHERE flow_id=?').bind(id),env.DB.prepare('DELETE FROM flows WHERE id=?').bind(id),audit(env,user.email,'flow.delete',f.name,{id})]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

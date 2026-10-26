import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {Flow,Step,enterMany,loadFlow,normalizeReply,parseFlow,touchThreads} from '../../../shared/bot';
import {User,audit} from './users';
import {seesCustomer,seesMessage} from './scope';
// Bot flows: admins build them; users see a customer's bot state in the messages table and can turn the bot off or on
// for a customer of their numbers.
const STEP_ID = /^s[0-9]{1,3}$/;
const OTHER_SYSTEM = 'מערכת אחרת'; // sent_by of a message recorded here that another system sent
// Where the step sits on the flow canvas (the editor's layout); the bot never reads it.
function position(v: unknown): {pos?:{x:number;y:number}} {
 if (v === undefined || v === null) return {};
 const p = v as Record<string,unknown>;
 if (typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 20000 || Math.abs(p.y) > 20000) throw new HttpError(400,'Invalid step position');
 return {pos:{x:Math.round(p.x),y:Math.round(p.y)}};
}
// optionalFirst: a first question sent from another system needs no text here (it is only used to ask again).
function steps(value: unknown, fields: Set<string>, optionalFirst = false): Step[] {
 if (!Array.isArray(value) || !value.length || value.length > 30) throw new HttpError(400,'A flow has 1 to 30 steps');
 const ids = new Set<string>(); for (const s of value) { const id = (s as Step)?.id; if (typeof id !== 'string' || !STEP_ID.test(id) || ids.has(id)) throw new HttpError(400,'Invalid step id'); ids.add(id); }
 const next = (v: unknown) => { if (v === undefined || v === null || v === '') return ''; if (typeof v !== 'string' || !ids.has(v)) throw new HttpError(400,'A step points to a step that does not exist'); return v; };
 const field = (v: unknown) => { if (v === undefined || v === null || v === '') return ''; if (typeof v !== 'string' || !fields.has(v)) throw new HttpError(400,'Unknown contact field'); return v; };
 return value.map((raw, i) => {
  const s = raw as Record<string,unknown>; const n = 'Step '+(i+1);
  const t = optionalFirst && i === 0 && (s.text === undefined || s.text === null || (typeof s.text === 'string' && !s.text.trim())) ? '' : text(typeof s.text === 'string' ? s.text.trim() : s.text,n+' text',1000); const type = s.type;
  const at = position(s.pos);
  if (type === 'end') return {id:s.id as string,text:t,type,...at};
  if (type === 'text') return {id:s.id as string,text:t,type,next:next(s.next),field:field(s.field),...at};
  if (type !== 'options') throw new HttpError(400,n+': invalid type');
  if (!Array.isArray(s.options) || !s.options.length || s.options.length > 20) throw new HttpError(400,n+': 1 to 20 answer options');
  const seen = new Set<string>();
  const options = s.options.map(o => { const v = o as Record<string,unknown>; const reply = text(typeof v.reply === 'string' ? v.reply.trim() : v.reply,n+' answer',60);
   for (const r of reply.split(',').map(normalizeReply).filter(Boolean)) { if (seen.has(r)) throw new HttpError(400,n+': the answer "'+r+'" appears twice'); seen.add(r); }
   const meaning = typeof v.meaning === 'string' ? v.meaning.trim().slice(0,60) : '';
   const say = v.say === undefined || v.say === null ? '' : typeof v.say === 'string' && v.say.trim().length <= 1000 ? v.say.trim() : (() => { throw new HttpError(400,n+': a reply has at most 1,000 characters'); })();
   return {reply,meaning,next:next(v.next),...(say ? {say} : {})}; });
  return {id:s.id as string,text:t,type,options,field:field(s.field),...at};
 });
}
// GET /api/bot/info?id=<message id>: the customer's bot state for that message's conversation, and the bot answer it gave.
export async function botInfo(url: URL, env: Env, user: User): Promise<Response> {
 const id = Number(url.searchParams.get('id')); if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid id');
 const m = await env.DB.prepare('SELECT system_number,peer_number FROM messages WHERE id=?').bind(id).first<{system_number:string;peer_number:string}>();
 if (!m || !await seesMessage(env,user,id)) throw new HttpError(404,'Message not found');
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
 if (typeof body.blocked !== 'boolean') throw new HttpError(400,'blocked must be true or false'); if (!await seesCustomer(env,user,system,peer)) throw new HttpError(403,'This customer is not in your messages');
 await env.DB.batch(body.blocked
  ? [env.DB.prepare('INSERT INTO bot_blocks (system_number,peer_number,created_at,created_by) VALUES (?,?,?,?) ON CONFLICT DO NOTHING').bind(system,peer,Date.now(),user.email),env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number=?').bind(system,peer),touchThreads(env,system,[peer],0,Date.now()),audit(env,user.email,'bot.block',peer,{system_number:system})]
  : [env.DB.prepare('DELETE FROM bot_blocks WHERE system_number=? AND peer_number=?').bind(system,peer),touchThreads(env,system,[peer],0,Date.now()),audit(env,user.email,'bot.unblock',peer,{system_number:system})]);
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
  const trigger = body.trigger; if (trigger !== 'any' && trigger !== 'keyword' && trigger !== 'send' && trigger !== 'external') throw new HttpError(400,'Invalid trigger');
  // Only for a first question sent elsewhere: read a customer's message that way once, or every time they write.
  const repeat = body.repeat_mode === undefined ? 'once' : body.repeat_mode; if (repeat !== 'once' && repeat !== 'always') throw new HttpError(400,'repeat_mode must be once or always');
  const keyword = trigger === 'keyword' ? normalizeReply(text(body.keyword,'keyword',30)) : null; if (trigger === 'keyword' && !keyword) throw new HttpError(400,'Enter a keyword');
  const list = steps(body.steps,fields,trigger === 'external'); if (trigger === 'external' && list[0].type === 'end') throw new HttpError(400,'The first step must be a question when it is sent from another system'); const fallback = typeof body.fallback === 'string' ? body.fallback.trim().slice(0,300) : '';
  const expire = body.expire_hours; if (!Number.isInteger(expire) || (expire as number) < 1 || (expire as number) > 720) throw new HttpError(400,'Expiry must be 1 to 720 hours');
  if (typeof body.active !== 'boolean') throw new HttpError(400,'active must be true or false');
  if (!await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=?').bind(system).first()) throw new HttpError(400,'Unknown system number');
  // The customers a flow is for: a shared list or one of the admin's own. A flow started from the dashboard goes to whoever it is sent to.
  const audience = trigger === 'send' || body.audience_list_id === undefined || body.audience_list_id === null ? null : body.audience_list_id;
  if (audience !== null && (!Number.isSafeInteger(audience) || !await env.DB.prepare('SELECT 1 FROM lists WHERE id=? AND (shared=1 OR owner=?)').bind(audience,user.email).first())) throw new HttpError(400,'Unknown list');
  const id = body.id === undefined || body.id === null ? null : body.id; if (id !== null && !Number.isSafeInteger(id)) throw new HttpError(400,'Invalid flow');
  // Only one active flow may answer any message on a number (starting on it, or reading it as the answer to a first
  // question sent elsewhere), and a keyword starts one flow only.
  // Flows for different audiences don't clash: a customer on the list gets the flow made for it.
  if (body.active) { const others = (await env.DB.prepare('SELECT id,name,trigger,keyword FROM flows WHERE system_number=? AND active=1 AND id!=? AND audience_list_id IS ?').bind(system,id ?? 0,audience).all<{name:string;trigger:string;keyword:string|null}>()).results;
   const every = (t: string) => t === 'any' || t === 'external';
   const clash = others.find(o => (every(trigger) && every(o.trigger)) || (trigger === 'keyword' && o.trigger === 'keyword' && o.keyword === keyword));
   if (clash) throw new HttpError(409,'The active flow "'+clash.name+'" already '+(every(trigger) ? 'answers every message on this number' : 'uses this keyword')); }
  const now = Date.now(); const values = [name,system,trigger,keyword,JSON.stringify(list),fallback,expire,body.active?1:0,repeat,audience,now];
  let saved: number;
  if (id === null) saved = (await env.DB.prepare('INSERT INTO flows (name,system_number,trigger,keyword,steps,fallback,expire_hours,active,repeat_mode,audience_list_id,updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(...values,now).first<{id:number}>())!.id;
  else { const r = await env.DB.prepare('UPDATE flows SET name=?,system_number=?,trigger=?,keyword=?,steps=?,fallback=?,expire_hours=?,active=?,repeat_mode=?,audience_list_id=?,updated_at=? WHERE id=?').bind(...values,id).run(); if (!r.meta.changes) throw new HttpError(404,'Flow not found'); saved = id as number; }
  // Conversations waiting on a step that no longer exists are ended.
  await env.DB.batch([env.DB.prepare('DELETE FROM conversations WHERE flow_id=? AND step NOT IN (SELECT json_extract(value,\'$.id\') FROM json_each(?))').bind(saved,JSON.stringify(list)),audit(env,user.email,'flow.save',name,{id:saved,system_number:system,trigger,...(trigger === 'external' ? {repeat_mode:repeat} : {}),steps:list.length,...(audience !== null ? {audience_list_id:audience} : {}),active:!!body.active})]);
  return json({ok:true,id:saved});
 }
// POST /api/admin/flows/record: a first message that another system already sent is written into this system, once per
// number, as the flow's opening message (nothing is sent). It shows at the start of the chat, the customers are put at
// the flow's first step so their replies continue it (unless they are already in the flow, then their progress stays), and the bot chats page lists them. The browser sends up to 500
// numbers per call under one record_id, so a repeated call adds nothing twice. Opted-out and bot-blocked numbers are skipped.
 if (path === 'flows/record') {
  const flowId = body.flow_id; if (!Number.isSafeInteger(flowId)) throw new HttpError(400,'Invalid flow');
  const flow = await loadFlow(env,flowId as number); if (!flow || !flow.steps.length) throw new HttpError(404,'Flow not found');
  const recordId = body.record_id; if (typeof recordId !== 'string' || !/^[0-9a-f-]{36}$/.test(recordId)) throw new HttpError(400,'Invalid record id');
  const message = text(typeof body.body === 'string' ? body.body.trim() : body.body,'message',1000);
  const at = body.sent_at; if (!Number.isSafeInteger(at) || (at as number) < Date.UTC(2020,0,1) || (at as number) > Date.now() + 60000) throw new HttpError(400,'Invalid send time');
  if (!Array.isArray(body.numbers) || !body.numbers.length || body.numbers.length > 500) throw new HttpError(400,'Send 1 to 500 numbers at a time');
  const numbers = new Set<string>(); let invalid = 0; for (const n of body.numbers) { try { numbers.add(recipient(n)); } catch { invalid++; } }
  const eligible = (await env.DB.prepare('SELECT value FROM json_each(?1) WHERE value NOT IN (SELECT number FROM opt_outs) AND value NOT IN (SELECT peer_number FROM bot_blocks WHERE system_number=?2)').bind(JSON.stringify([...numbers]),flow.system_number).all<{value:string}>()).results.map(r => r.value);
  // Customers already in this flow (a conversation, an answer, or a first reply the bot read) keep their progress: the
  // bot answered them already, so only the opening message is added to their chat. The others start at the first step.
  const fresh = eligible.length ? (await env.DB.prepare('SELECT value FROM json_each(?1) WHERE NOT EXISTS (SELECT 1 FROM conversations c WHERE c.system_number=?2 AND c.peer_number=value AND c.flow_id=?3) AND NOT EXISTS (SELECT 1 FROM bot_answers a WHERE a.system_number=?2 AND a.peer_number=value AND a.flow_id=?3) AND NOT EXISTS (SELECT 1 FROM flow_customers f WHERE f.flow_id=?3 AND f.peer_number=value)').bind(JSON.stringify(eligible),flow.system_number,flow.id).all<{value:string}>()).results.map(r => r.value) : [];
  const now = Date.now(); const first = flow.steps[0];
  const results = await env.DB.batch([
   env.DB.prepare("INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,updated_at,sent_by,bot) SELECT json_array('out','first:'||?1||':'||value),'out',?2,value,?3,?4,?5,'provider','accepted',?5,?6,?7 FROM json_each(?8) WHERE true ON CONFLICT(event_key) DO NOTHING").bind(recordId,flow.system_number,message,at,now,OTHER_SYSTEM,JSON.stringify({flow:flow.id,step:first.id,start:true,external:true}),JSON.stringify(eligible)),
   enterMany(env,flow,first,flow.system_number,fresh,now),
   // The chat starts when the message was sent. updated_at moves forward, so live updates see the change.
   env.DB.prepare('INSERT INTO bot_threads (system_number,peer_number,flow_id,started_at,last_at,updated_at) SELECT ?1,value,?2,?3,?3,?4 FROM json_each(?5) WHERE true ON CONFLICT(system_number,peer_number) DO UPDATE SET flow_id=excluded.flow_id,started_at=MIN(bot_threads.started_at,excluded.started_at),last_at=MAX(bot_threads.last_at,excluded.last_at),updated_at=MAX(excluded.updated_at,bot_threads.updated_at+1)').bind(flow.system_number,flow.id,at,now,JSON.stringify(eligible)),
   audit(env,user.email,'flow.record',flow.name,{id:flow.id,record_id:recordId,numbers:eligible.length,kept:eligible.length - fresh.length}),
  ]);
  return json({ok:true,added:results[0].meta.changes,invalid,skipped:numbers.size - eligible.length,kept:eligible.length - fresh.length});
 }
 if (path === 'flows/delete') {
  const id = body.id; if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid flow'); const f = await env.DB.prepare('SELECT name FROM flows WHERE id=?').bind(id).first<{name:string}>(); if (!f) throw new HttpError(404,'Flow not found');
  await env.DB.batch([env.DB.prepare('DELETE FROM conversations WHERE flow_id=?').bind(id),env.DB.prepare('DELETE FROM bot_answers WHERE flow_id=?').bind(id),env.DB.prepare('DELETE FROM flows WHERE id=?').bind(id),audit(env,user.email,'flow.delete',f.name,{id})]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

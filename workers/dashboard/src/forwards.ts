import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {MAX_ATTEMPTS,attempt,buildRequest,deliver} from '../../../shared/forwarding';
import {User,audit} from './users';
import {Fetcher} from './send';
// Admin management of forwarding rules (incoming messages of a number sent to a webhook) and their delivery log.
const RESERVED = ['host','content-type','content-length','user-agent','x-sms-signature','x-sms-delivery'];
const secret = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2,'0')).join('');
function url(value: unknown): string {
 const v = text(typeof value === 'string' ? value.trim() : value,'webhook address',500); let u: URL; try { u = new URL(v); } catch { throw new HttpError(400,'Invalid webhook address'); }
 if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) throw new HttpError(400,'The webhook address must start with https:// and contain no username or password');
 return u.toString();
}
function headers(value: unknown): Record<string,string> {
 if (value === undefined || value === null) return {}; if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400,'Invalid headers');
 const out: Record<string,string> = {}; const entries = Object.entries(value as Record<string,unknown>); if (entries.length > 10) throw new HttpError(400,'Up to 10 headers');
 for (const [k,v] of entries) { if (!/^[A-Za-z0-9-]{1,64}$/.test(k) || RESERVED.includes(k.toLowerCase())) throw new HttpError(400,'Header name not allowed: '+k.slice(0,64)); if (typeof v !== 'string' || v.length > 1000 || /[\r\n]/.test(v)) throw new HttpError(400,'Invalid value for header '+k); out[k] = v; }
 return out;
}
export async function forwards(request: Request, path: string, env: Env, user: User, fetcher: Fetcher): Promise<Response> {
 if (request.method === 'GET') {
  const [rules,recent] = await Promise.all([
   env.DB.prepare("SELECT r.id,r.name,r.system_number,r.senders,r.url,r.format,r.headers,r.secret,r.active,r.updated_at,(SELECT COUNT(*) FROM deliveries d WHERE d.rule_id=r.id AND d.status='failed') AS failed,(SELECT COUNT(*) FROM deliveries d WHERE d.rule_id=r.id AND d.status='pending') AS pending FROM forward_rules r ORDER BY r.name,r.id").all<Record<string,unknown>>(),
   env.DB.prepare('SELECT d.id,d.rule_id,d.status,d.attempts,d.next_at,d.last_status,d.last_error,d.created_at,d.updated_at,m.peer_number,m.body FROM deliveries d JOIN messages m ON m.id=d.message_id ORDER BY d.id DESC LIMIT 100').all(),
  ]);
  return json({rules:rules.results.map(r => ({...r,senders:JSON.parse(String(r.senders)),headers:JSON.parse(String(r.headers))})),deliveries:recent.results,max_attempts:MAX_ATTEMPTS});
 }
 const body = await readBody(request, 65536);
 if (path === 'forwards/save') {
  const name = text(typeof body.name === 'string' ? body.name.trim() : body.name,'name',60); const system = phone(body.system_number); const target = url(body.url);
  const format = body.format === 'micropay' ? 'micropay' : body.format === 'json' ? 'json' : (() => { throw new HttpError(400,'Invalid format'); })();
  if (!Array.isArray(body.senders) || body.senders.length > 500) throw new HttpError(400,'Up to 500 sender numbers');
  const senders = [...new Set(body.senders.map(s => { try { return recipient(s); } catch { throw new HttpError(400,'Invalid sender number: '+String(s).slice(0,30)); } }))];
  const extra = headers(body.headers); if (typeof body.active !== 'boolean') throw new HttpError(400,'active must be true or false');
  if (!await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=?').bind(system).first()) throw new HttpError(400,'Unknown system number');
  const now = Date.now(); const values = [name,system,JSON.stringify(senders),target,format,JSON.stringify(extra),body.active?1:0,now];
  let id: number;
  if (body.id === undefined || body.id === null) id = (await env.DB.prepare('INSERT INTO forward_rules (name,system_number,senders,url,format,headers,active,updated_at,secret,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(...values,secret(),now).first<{id:number}>())!.id;
  else { if (!Number.isSafeInteger(body.id)) throw new HttpError(400,'Invalid rule'); const r = await env.DB.prepare('UPDATE forward_rules SET name=?,system_number=?,senders=?,url=?,format=?,headers=?,active=?,updated_at=? WHERE id=?').bind(...values,body.id).run(); if (!r.meta.changes) throw new HttpError(404,'Rule not found'); id = body.id as number; }
  await audit(env,user.email,'forward.save',name,{id,system_number:system,senders:senders.length,format,active:!!body.active,host:new URL(target).host}).run();
  return json({ok:true,id});
 }
 const id = body.id; if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid id');
 if (path === 'forwards/delete') {
  const rule = await env.DB.prepare('SELECT name FROM forward_rules WHERE id=?').bind(id).first<{name:string}>(); if (!rule) throw new HttpError(404,'Rule not found');
  await env.DB.batch([env.DB.prepare('DELETE FROM deliveries WHERE rule_id=?').bind(id),env.DB.prepare('DELETE FROM forward_rules WHERE id=?').bind(id),audit(env,user.email,'forward.delete',rule.name,{id})]);
  return json({ok:true});
 }
 if (path === 'forwards/secret') { const s = secret(); const r = await env.DB.prepare('UPDATE forward_rules SET secret=?,updated_at=? WHERE id=?').bind(s,Date.now(),id).run(); if (!r.meta.changes) throw new HttpError(404,'Rule not found'); await audit(env,user.email,'forward.secret',null,{id}).run(); return json({secret:s}); }
 // A sample message (marked "test" in JSON) is sent right away; it is not stored or logged as a delivery.
 if (path === 'forwards/test') {
  const rule = await env.DB.prepare('SELECT r.url,r.format,r.headers,r.secret,r.system_number,s.label FROM forward_rules r LEFT JOIN system_numbers s ON s.number=r.system_number WHERE r.id=?').bind(id).first<{url:string;format:'json'|'micropay';headers:string;secret:string;system_number:string;label:string|null}>();
  if (!rule) throw new HttpError(404,'Rule not found'); const now = Date.now();
  const result = await attempt(fetcher,rule.url,await buildRequest(rule,{message_id:0,event_key:JSON.stringify(['in','test-'+now]),system_number:rule.system_number,peer_number:'+972500000000',body:'הודעת בדיקה מלוח ההודעות',occurred_at:now,received_at:now,label:rule.label,contact:null},'test',true));
  await audit(env,user.email,'forward.test',null,{id,ok:result.ok,status:result.status}).run();
  return json(result);
 }
 // Resend: a failed delivery gets one more attempt now, and the timer keeps retrying it if that fails too.
 if (path === 'forwards/resend') {
  const r = await env.DB.prepare("UPDATE deliveries SET status='pending',attempts=MIN(attempts,?),next_at=?,updated_at=? WHERE id=? AND status!='delivered'").bind(MAX_ATTEMPTS-1,Date.now(),Date.now(),id).run();
  if (!r.meta.changes) throw new HttpError(409,'This delivery cannot be resent');
  const result = await deliver(env,fetcher,id as number); await audit(env,user.email,'forward.resend',null,{id,ok:result?.ok ?? false}).run();
  return json(result ?? {ok:false,status:null,error:'Already being sent'});
 }
 throw new HttpError(404,'Not found');
}

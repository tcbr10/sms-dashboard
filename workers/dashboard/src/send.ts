import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {render,unknownVariables} from '../../../shared/template';
import {executeSend,prepareSend} from '../../../shared/dispatch';
import {audit} from '../../../shared/records';
import {User} from './users';
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const YEAR = 366 * 86400000;
// Sends one message to one or more recipients, now or at send_at. The client-generated ID makes retries and double
// clicks safe: an ID that was already used returns the earlier result and never calls Micropay again. A test send goes
// to exactly one number and, with bulk_preview, carries the opt-out text exactly as the multi-recipient send would.
export async function send(request: Request, env: Env, user: User, fetcher: Fetcher): Promise<Response> {
 const body = await readBody(request, 131072);
 const id = text(body.id,'id',36); if (!UUID.test(id)) throw new HttpError(400,'Invalid id');
 const previous = await env.DB.prepare('SELECT email,status,recipients FROM sends WHERE id=?').bind(id).first<{email:string;status:string;recipients:number}>();
 if (previous) { if (previous.email !== user.email) throw new HttpError(409,'Send ID already used'); return json({id,status:previous.status,sent:previous.recipients,duplicate:true}); }
 if (body.send_at !== undefined && body.send_at !== null) return schedule(env,user,id,body);
 const token = env.MICROPAY_TOKEN; if (!token) throw new HttpError(503,'Sending is not configured');
 const p = await prepareSend(env,user,body);
 const result = await executeSend(env,fetcher,token,id,user,p,p.recipients,(p.test?'sms-dashboard test ':'sms-dashboard ')+user.email);
 return json({id,...result});
}
// A scheduled send is checked now (permissions, recipients, variables, flow) and stored; the ingest Worker's timer
// sends it at send_at, checking permissions again and reading opt-outs, the daily limit and contact data then.
async function schedule(env: Env, user: User, id: string, body: Record<string,unknown>): Promise<Response> {
 const at = body.send_at; const now = Date.now();
 if (!Number.isSafeInteger(at) || (at as number) < now + 60000 || (at as number) > now + YEAR) throw new HttpError(400,'Choose a send time at least a minute from now and within a year');
 if (body.test === true) throw new HttpError(400,'Test sends cannot be scheduled');
 const p = await prepareSend(env,user,body);
 const r = await env.DB.prepare("INSERT INTO scheduled_sends (id,email,system_number,body,recipients,invalid,duplicates,flow_id,stop_bot,send_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'scheduled',?,?) ON CONFLICT(id) DO NOTHING").bind(id,user.email,p.system,p.message,JSON.stringify(p.recipients),p.invalid,p.duplicates,p.flow?.id ?? null,p.stopBot?1:0,at,now,now).run();
 if (!r.meta.changes) { const s = await env.DB.prepare('SELECT email,send_at FROM scheduled_sends WHERE id=?').bind(id).first<{email:string;send_at:number}>(); if (s?.email !== user.email) throw new HttpError(409,'Send ID already used'); return json({id,scheduled:true,send_at:s.send_at,recipients:p.recipients.length,duplicate:true}); }
 await audit(env,user.email,'send.schedule',p.system,{id,recipients:p.recipients.length,send_at:at,...(p.flow?{flow:p.flow.id}:{})}).run();
 return json({id,scheduled:true,send_at:at,recipients:p.recipients.length,skipped:{invalid:p.invalid,duplicates:p.duplicates}});
}
// GET /api/scheduled: the user's scheduled sends (admins see everyone's). POST cancel or reschedule while it waits.
export async function scheduled(request: Request, url: URL, env: Env, user: User): Promise<Response> {
 const admin = user.role === 'admin';
 if (request.method === 'GET') {
  const rows = await env.DB.prepare(`SELECT s.id,s.email,s.system_number,s.body,json_array_length(s.recipients) AS recipients,s.flow_id,f.name AS flow,s.send_at,s.status,s.progress,s.result,s.created_at FROM scheduled_sends s LEFT JOIN flows f ON f.id=s.flow_id WHERE ${admin ? '1' : 's.email=?'} ORDER BY CASE s.status WHEN 'scheduled' THEN 0 ELSE 1 END,CASE s.status WHEN 'scheduled' THEN s.send_at ELSE -s.send_at END LIMIT 200`).bind(...(admin ? [] : [user.email])).all<{result:string|null}>();
  return json({scheduled:rows.results.map(r => ({...r,result:r.result ? JSON.parse(r.result) : null}))});
 }
 const body = await readBody(request); const id = text(body.id,'id',36);
 const row = await env.DB.prepare('SELECT email,status,progress,locked_until FROM scheduled_sends WHERE id=?').bind(id).first<{email:string;status:string;progress:number;locked_until:number|null}>();
 if (!row || (!admin && row.email !== user.email)) throw new HttpError(404,'Scheduled send not found');
 if (row.status !== 'scheduled' || row.progress > 0 || (row.locked_until && row.locked_until > Date.now())) throw new HttpError(409,'This send has already started or finished');
 if (url.pathname === '/api/scheduled/cancel') {
  await env.DB.batch([env.DB.prepare("UPDATE scheduled_sends SET status='cancelled',updated_at=? WHERE id=? AND status='scheduled' AND progress=0").bind(Date.now(),id),audit(env,user.email,'send.cancel',null,{id})]);
  return json({ok:true});
 }
 if (url.pathname === '/api/scheduled/reschedule') {
  const at = body.send_at; const now = Date.now(); if (!Number.isSafeInteger(at) || (at as number) < now + 60000 || (at as number) > now + YEAR) throw new HttpError(400,'Choose a send time at least a minute from now and within a year');
  await env.DB.batch([env.DB.prepare("UPDATE scheduled_sends SET send_at=?,updated_at=? WHERE id=? AND status='scheduled' AND progress=0").bind(at,now,id),audit(env,user.email,'send.reschedule',null,{id,send_at:at})]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}
// POST /api/send/preview {system_number, recipient, body, bulk}: the message as this recipient would get it.
export async function preview(request: Request, env: Env, user: User): Promise<Response> {
 const body = await readBody(request, 32768); const system = phone(body.system_number); const settings = await loadSettings(env.DB);
 const allowed = user.role === 'admin' ? await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=? AND active=1').bind(system).first() : await env.DB.prepare('SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND u.can_send=1 AND s.active=1').bind(user.email,system).first();
 if (!allowed) throw new HttpError(403,'Sending from this number is not allowed');
 const message = text(body.body,'message',1000); const n = recipient(body.recipient);
 const contact = await env.DB.prepare('SELECT data FROM contacts WHERE number=?').bind(n).first<{data:string}>();
 let t = render(message,settings.contact_fields,contact ? JSON.parse(contact.data) : null,n); if (body.bulk === true && settings.optout_text && !t.includes(settings.optout_text)) t += '\n' + settings.optout_text;
 return json({body:t,unknown:unknownVariables(message,settings.contact_fields)});
}

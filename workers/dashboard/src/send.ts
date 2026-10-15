import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {sendMicropay} from '../../../shared/micropay-send';
import {User,audit,sentLast24h} from './users';
import {enterMany,loadFlow} from '../../../shared/bot';
import {hasVariables,render,unknownVariables} from '../../../shared/template';
// Personalized messages need one Micropay call per distinct text; the free plan allows 50 outgoing calls per request,
// so the browser sends them in batches of this many recipients.
export const PERSONAL_BATCH = 40;
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
// Sends one message to one or more recipients. The client-generated ID makes retries and double clicks safe:
// an ID that was already used returns the earlier result and never calls Micropay again. A test send goes to exactly
// one number and, with bulk_preview, carries the opt-out text exactly as the multi-recipient send would.
export async function send(request: Request, env: Env, user: User, fetcher: Fetcher): Promise<Response> {
 const token = env.MICROPAY_TOKEN; if (!token) throw new HttpError(503,'Sending is not configured');
 const body = await readBody(request, 131072);
 const id = text(body.id,'id',36); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new HttpError(400,'Invalid id');
 const previous = await env.DB.prepare('SELECT email,status,recipients FROM sends WHERE id=?').bind(id).first<{email:string;status:string;recipients:number}>();
 if (previous) { if (previous.email !== user.email) throw new HttpError(409,'Send ID already used'); return json({id,status:previous.status,sent:previous.recipients,duplicate:true}); }
 const settings = await loadSettings(env.DB); const admin = user.role === 'admin'; const system = phone(body.system_number);
 const allowed = admin ? await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=? AND active=1').bind(system).first() : await env.DB.prepare('SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND u.can_send=1 AND s.active=1').bind(user.email,system).first();
 if (!allowed) throw new HttpError(403,'Sending from this number is not allowed');
 // A send can start a bot flow: the message is the flow's first step, and the recipients' replies continue the flow.
 const flow = body.flow_id === undefined || body.flow_id === null ? null : Number.isSafeInteger(body.flow_id) ? await loadFlow(env,body.flow_id as number) : null;
 if (body.flow_id !== undefined && body.flow_id !== null && (!flow || !flow.active || flow.system_number !== system || !flow.steps.length)) throw new HttpError(400,'This flow is not active on this number');
 const stopBot = body.stop_bot === true && !flow;
 let message = flow ? flow.steps[0].text : text(body.body,'message',1000); if (!message.trim()) throw new HttpError(400,'Message is empty');
 const test = body.test === true; if (test && (!Array.isArray(body.recipients) || body.recipients.length !== 1)) throw new HttpError(400,'A test goes to exactly one number');
 if (!Array.isArray(body.recipients) || !body.recipients.length) throw new HttpError(400,'Add at least one recipient'); if (body.recipients.length > 10000) throw new HttpError(413,'Too many recipients');
 const unique = new Set<string>(); let invalid = 0;
 for (const r of body.recipients) { try { const n = recipient(r); if (!settings.allow_international && !n.startsWith('+972')) throw new Error(); unique.add(n); } catch { invalid++; } }
 const duplicates = body.recipients.length - invalid - unique.size;
 if (unique.size > 1 && !admin && !user.can_bulk_send) throw new HttpError(403,'Sending to more than one recipient is not allowed for this user');
 if (unique.size > settings.max_recipients) throw new HttpError(413,'Too many recipients (the limit is '+settings.max_recipients+')');
 const blocked = new Set((await env.DB.prepare('SELECT number FROM opt_outs WHERE number IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...unique])).all<{number:string}>()).results.map(r => r.number));
 const recipients = [...unique].filter(n => !blocked.has(n)); if (!recipients.length) throw new HttpError(400,'No valid recipients left to send to');
 if (!admin) { const limit = user.daily_limit ?? settings.default_daily_limit; const used = await sentLast24h(env,user.email); if (used + recipients.length > limit) throw new HttpError(429,'Daily limit reached: '+used+' of '+limit+' recipients used in the last 24 hours'); }
 // Variables ({שם}, {טלפון}…) are rendered per recipient, and recipients whose text comes out the same share one call.
 // bulk marks one batch of a larger send, so the opt-out text matches the whole send.
 const personal = hasVariables(message);
 if (personal) { const unknown = unknownVariables(message,settings.contact_fields); if (unknown.length) throw new HttpError(400,'Unknown variable: {'+unknown.join('}, {')+'}'); if (recipients.length > PERSONAL_BATCH) throw new HttpError(413,'Personalized messages go out in batches of up to '+PERSONAL_BATCH+' recipients'); }
 const bulk = recipients.length > 1 || body.bulk === true || (test && body.bulk_preview === true);
 const withOptout = (t: string) => bulk && settings.optout_text && !t.includes(settings.optout_text) ? t + '\n' + settings.optout_text : t;
 const contacts = new Map<string,Record<string,string>>(personal ? (await env.DB.prepare('SELECT number,data FROM contacts WHERE number IN (SELECT value FROM json_each(?))').bind(JSON.stringify(recipients)).all<{number:string;data:string}>()).results.map(r => [r.number,JSON.parse(r.data)]) : []);
 const groups = new Map<string,string[]>();
 for (const n of recipients) { const t = withOptout(personal ? render(message,settings.contact_fields,contacts.get(n) ?? null,n) : message);
  if (!t.trim()) throw new HttpError(400,'The message comes out empty for '+n); if (t.length > 1000) throw new HttpError(400,personal ? 'The message is too long for '+n : 'Message is too long once the opt-out text is added');
  const g = groups.get(t); if (g) g.push(n); else groups.set(t,[n]); }
 const now = Date.now();
 const claim = await env.DB.prepare("INSERT INTO sends (id,email,system_number,body,recipients,status,created_at,is_test) VALUES (?,?,?,?,?,'sending',?,?) ON CONFLICT(id) DO NOTHING").bind(id,user.email,system,withOptout(message),recipients.length,now,test?1:0).run();
 if (!claim.meta.changes) return json({id,status:'sending',sent:recipients.length,duplicate:true});
 // Up to six calls at a time (the Workers connection limit).
 const entries = [...groups]; const results: Awaited<ReturnType<typeof sendMicropay>>[] = new Array(entries.length); let next = 0;
 await Promise.all(Array.from({length:Math.min(6,entries.length)},async () => { while (next < entries.length) { const i = next++; results[i] = await sendMicropay(fetcher,token,{from:system,to:entries[i][1],body:entries[i][0],desc:(test?'sms-dashboard test ':'sms-dashboard ')+user.email}); } }));
 const counts = {accepted:0,rejected:0,unknown:0}; entries.forEach(([,to],i) => { counts[results[i].submission_status] += to.length; });
 const status = counts.accepted === recipients.length ? 'accepted' : counts.rejected === recipients.length ? 'rejected' : 'unknown';
 const error = results.find(r => r.error)?.error ?? null;
 const rows = entries.flatMap(([t,to],i) => to.map(n => ({number:n,body:t,status:results[i].submission_status,task:results[i].task_id ?? null})));
 // Never retried automatically: an unknown result may still have been sent.
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at,sent_by,send_id) SELECT json_array('out','send:'||?1||':'||json_extract(value,'$.number')),'out',?2,json_extract(value,'$.number'),json_extract(value,'$.body'),?3,?3,'workflow',json_extract(value,'$.status'),json_extract(value,'$.task'),?3,?4,?1 FROM json_each(?5) WHERE true ON CONFLICT(event_key) DO NOTHING`).bind(id,system,now,user.email,JSON.stringify(rows)),
  env.DB.prepare('UPDATE sends SET status=?,task_id=?,error=?,finished_at=? WHERE id=?').bind(status,results.length === 1 ? results[0].task_id ?? null : null,error,Date.now(),id),
  audit(env,user.email,'send',system,{id,recipients:recipients.length,status,...(personal?{personalized:true,texts:entries.length}:{}),...(test?{test:true}:{}),...(flow?{flow:flow.id}:{}),...(stopBot?{stop_bot:true}:{})}),
 ]);
 const reached = rows.filter(r => r.status !== 'rejected').map(r => r.number);
 // Bot state follows only sends that may have gone out. Starting a flow lifts a bot block for these recipients.
 // One statement per change for all recipients: the free plan allows 50 queries per request.
 const list = JSON.stringify(reached);
 if (reached.length && !test && (flow || stopBot)) await env.DB.batch(flow
  ? [env.DB.prepare('DELETE FROM bot_blocks WHERE system_number=? AND peer_number IN (SELECT value FROM json_each(?))').bind(system,list),enterMany(env,flow,flow.steps[0],system,reached,now)]
  : [env.DB.prepare('INSERT INTO bot_blocks (system_number,peer_number,created_at,created_by) SELECT ?,value,?,? FROM json_each(?) WHERE true ON CONFLICT DO NOTHING').bind(system,now,user.email,list),env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number IN (SELECT value FROM json_each(?))').bind(system,list)]);
 return json({id,status,sent:recipients.length,counts,skipped:{invalid,duplicates,opted_out:blocked.size},task_id:results.length === 1 ? results[0].task_id ?? null : null,error:status === 'accepted' ? null : error});
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

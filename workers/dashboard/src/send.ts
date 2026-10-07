import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {micropaySubmission,SubmissionResult} from '../../../shared/micropay-submission';
import {User,audit,sentLast24h} from './users';
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const MICROPAY_SEND = 'https://www.micropay.co.il/extApi/scheduleSms.php';
// Micropay's examples use local Israeli numbers; other countries go as digits with the country code.
const micropayNumber = (n: string) => n.startsWith('+972') ? '0' + n.slice(4) : n.slice(1);
// Sends one message to one or more recipients. The client-generated ID makes retries and double clicks safe:
// an ID that was already used returns the earlier result and never calls Micropay again. A test send goes to exactly
// one number and, with bulk_preview, carries the opt-out text exactly as the multi-recipient send would.
export async function send(request: Request, env: Env, user: User, fetcher: Fetcher): Promise<Response> {
 if (!env.MICROPAY_TOKEN) throw new HttpError(503,'Sending is not configured');
 const body = await readBody(request, 131072);
 const id = text(body.id,'id',36); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new HttpError(400,'Invalid id');
 const previous = await env.DB.prepare('SELECT email,status,recipients FROM sends WHERE id=?').bind(id).first<{email:string;status:string;recipients:number}>();
 if (previous) { if (previous.email !== user.email) throw new HttpError(409,'Send ID already used'); return json({id,status:previous.status,sent:previous.recipients,duplicate:true}); }
 const settings = await loadSettings(env.DB); const admin = user.role === 'admin'; const system = phone(body.system_number);
 const allowed = admin ? await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=? AND active=1').bind(system).first() : await env.DB.prepare('SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND u.can_send=1 AND s.active=1').bind(user.email,system).first();
 if (!allowed) throw new HttpError(403,'Sending from this number is not allowed');
 let message = text(body.body,'message',1000); if (!message.trim()) throw new HttpError(400,'Message is empty');
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
 if ((recipients.length > 1 || (test && body.bulk_preview === true)) && settings.optout_text && !message.includes(settings.optout_text)) message += '\n' + settings.optout_text;
 if (message.length > 1000) throw new HttpError(400,'Message is too long once the opt-out text is added');
 const now = Date.now();
 const claim = await env.DB.prepare("INSERT INTO sends (id,email,system_number,body,recipients,status,created_at,is_test) VALUES (?,?,?,?,?,'sending',?,?) ON CONFLICT(id) DO NOTHING").bind(id,user.email,system,message,recipients.length,now,test?1:0).run();
 if (!claim.meta.changes) return json({id,status:'sending',sent:recipients.length,duplicate:true});
 let result: SubmissionResult = {submission_status:'unknown'}; let error: string|null = null;
 try {
  const response = await fetcher(MICROPAY_SEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:env.MICROPAY_TOKEN,from:micropayNumber(system),msg:message.replace(/\r?\n/g,'\r\n'),list:recipients.map(micropayNumber).join(','),desc:(test?'sms-dashboard test ':'sms-dashboard ')+user.email}),signal:AbortSignal.timeout(25000)});
  const raw = (await response.text()).slice(0,2000); if (response.ok) result = micropaySubmission(raw); if (result.submission_status !== 'accepted') error = ('HTTP '+response.status+' '+raw).slice(0,300);
 } catch { error = 'Micropay did not answer in time; the message may or may not have been sent'; }
 const status = result.submission_status;
 // Never retried automatically: an unknown result may still have been sent.
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at,sent_by,send_id) SELECT json_array('out','send:'||?1||':'||value),'out',?2,value,?3,?4,?4,'workflow',?5,NULL,?4,?6,?1 FROM json_each(?7) WHERE true ON CONFLICT(event_key) DO NOTHING`).bind(id,system,message,now,status,user.email,JSON.stringify(recipients)),
  env.DB.prepare('UPDATE sends SET status=?,task_id=?,error=?,finished_at=? WHERE id=?').bind(status,result.task_id ?? null,error,Date.now(),id),
  audit(env,user.email,'send',system,{id,recipients:recipients.length,status,...(test?{test:true}:{})}),
 ]);
 return json({id,status,sent:recipients.length,skipped:{invalid,duplicates,opted_out:blocked.size},task_id:result.task_id ?? null,error:status === 'accepted' ? null : error});
}

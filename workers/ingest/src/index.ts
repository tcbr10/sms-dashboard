import {Env, HttpError, failure, json, phone, readBody, text, timestamp} from '../../../shared/validation';
import {readMicropay, micropayAcknowledgement} from './micropay';
import {DEFAULT_SETTINGS, isOptOut} from '../../../shared/settings';
import {Fetch, deliver, enqueue, runDue} from '../../../shared/forwarding';
import {handleIncoming} from '../../../shared/bot';
import {sendMicropay} from '../../../shared/micropay-send';
import {runScheduled} from '../../../shared/scheduled';
async function equal(a: string, b: string): Promise<boolean> { const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); const [x,y] = await Promise.all([hash(a),hash(b)]); let difference = 0; for (let i=0;i<x.length;i++) difference |= x[i] ^ y[i]; return difference === 0; }
// Micropay can only be configured with a URL, so its route also accepts ?token=.
async function authorize(request: Request, expected: string | undefined, allowQuery = false): Promise<void> {
 if (!expected || expected.length < 32) throw new HttpError(503, 'Ingestion is not configured');
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1] ?? (allowQuery ? new URL(request.url).searchParams.get('token') : null);
 if (!token || !await equal(token, expected)) throw new HttpError(401, 'Invalid ingestion credential');
}
async function store(direction: 'in'|'out', body: Record<string, unknown>, env: Env) {
 const now = Date.now(); const system = phone(body.system_number);
 const registered = await env.DB.prepare('SELECT number,bot_reply FROM system_numbers WHERE number = ? AND active = 1').bind(system).first<{number:string;bot_reply:'response'|'api'}>(); if (!registered) throw new HttpError(403, 'Unknown or inactive system number');
 const peer = phone(body.peer_number); const message = text(body.body, 'body', 10000);
 const eventId = body.event_id === undefined ? (direction === 'in' ? crypto.randomUUID() : text(body.event_id,'event_id',256)) : text(body.event_id,'event_id',256);
 const key = JSON.stringify([direction,eventId]); const occurred = timestamp(body.occurred_at, now); const timeSource = body.occurred_at === undefined ? 'receipt' : direction === 'in' ? 'provider' : 'workflow';
 const status = direction === 'out' ? text(body.submission_status,'submission_status',16) : null;
 if (status && !['pending','accepted','rejected','unknown'].includes(status)) throw new HttpError(400, 'Invalid submission_status');
 const providerId = body.provider_message_id === undefined ? null : text(body.provider_message_id,'provider_message_id',256);
 const sql = direction === 'in' ? `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING` : `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO UPDATE SET submission_status=excluded.submission_status, provider_message_id=COALESCE(excluded.provider_message_id,messages.provider_message_id), updated_at=CASE WHEN messages.submission_status != excluded.submission_status OR (excluded.provider_message_id IS NOT NULL AND COALESCE(messages.provider_message_id,'') != excluded.provider_message_id) THEN MAX(excluded.updated_at,messages.updated_at+1) ELSE messages.updated_at END WHERE messages.system_number=excluded.system_number AND messages.peer_number=excluded.peer_number AND messages.body=excluded.body AND (messages.submission_status IN ('pending','unknown') OR messages.submission_status=excluded.submission_status)`;
 const written = await env.DB.prepare(sql).bind(key,direction,system,peer,message,occurred,now,timeSource,status,providerId,now).run();
 const stored = await env.DB.prepare('SELECT id,system_number,peer_number,body,submission_status FROM messages WHERE event_key = ?').bind(key).first<{id:number;system_number:string;peer_number:string;body:string;submission_status:string|null}>();
 if (!stored) throw new Error('Persistence failed');
 if (stored.system_number !== system || stored.peer_number !== peer || stored.body !== message) throw new HttpError(409, 'Event ID reused with different message content');
 if (direction === 'out' && status !== stored.submission_status && status !== 'pending' && status !== 'unknown') throw new HttpError(409, 'Conflicting final submission status');
 if (direction === 'in' && message.length <= 30) await optOut(env, peer, message);
 return {response:{ok:true,id:stored.id,deduplicated_by_id:body.event_id !== undefined,submission_status:stored.submission_status},id:stored.id,inserted:written.meta.changes > 0,system,peer,botReply:registered.bot_reply};
}
export type Options = {fetcher?:Fetch;waitUntil?:(promise:Promise<unknown>)=>void};
// Sends a bot reply through Micropay's API and records the result on the logged reply. A retried webhook call never
// gets here (only newly stored messages do), so a reply is sent at most once.
async function botApiReply(env: Env, stored: {id:number;system:string;peer:string}, reply: string, options: Options): Promise<void> {
 const key = JSON.stringify(['out','bot:'+stored.id]);
 try {
  const r = env.MICROPAY_TOKEN ? await sendMicropay(options.fetcher ?? ((u,i) => fetch(u,i)), env.MICROPAY_TOKEN, {from:stored.system,to:[stored.peer],body:reply,desc:'sms-dashboard bot'}) : {submission_status:'rejected' as const,error:'MICROPAY_TOKEN is not set on the ingest Worker'};
  if (r.error) console.error('Bot reply via API', r.submission_status, r.error);
  await env.DB.prepare('UPDATE messages SET submission_status=?,provider_message_id=?,updated_at=MAX(?,updated_at+1) WHERE event_key=?').bind(r.submission_status,'task_id' in r ? r.task_id ?? null : null,Date.now(),key).run();
 } catch (error) { console.error('Bot reply via API failed', error instanceof Error ? error.message : error); }
}
// A newly stored incoming message is queued for every matching forwarding rule and tried after the response is sent.
// Errors here are only logged: the message is stored, and Micropay must not see a failure.
async function forward(env: Env, stored: {id:number;inserted:boolean;system:string;peer:string}, options: Options): Promise<void> {
 if (!stored.inserted) return;
 try { const ids = await enqueue(env, stored.id, stored.system, stored.peer); if (!ids.length) return; const fetcher = options.fetcher ?? ((u, i) => fetch(u, i));
  const run = Promise.all(ids.map(id => deliver(env, fetcher, id).catch(e => console.error('Delivery failed', id, e instanceof Error ? e.message : e)))); if (options.waitUntil) options.waitUntil(run); else await run; }
 catch (error) { console.error('Forwarding failed', error instanceof Error ? error.message : error); }
}
// A customer who replies with an opt-out word is skipped by future dashboard sends. Never fails the ingestion itself:
// the message is already stored, and an error here must not make Micropay send the customer an error SMS.
async function optOut(env: Env, peer: string, message: string): Promise<void> {
 try { const row = await env.DB.prepare("SELECT value FROM settings WHERE key='optout_keywords'").first<{value:string}>(); const keywords = row ? JSON.parse(row.value) as string[] : DEFAULT_SETTINGS.optout_keywords;
  if (isOptOut(message, keywords)) await env.DB.prepare("INSERT INTO opt_outs (number,source,created_at) VALUES (?,'keyword',?) ON CONFLICT(number) DO NOTHING").bind(peer, Date.now()).run(); }
 catch (error) { console.error('Opt-out check failed', error instanceof Error ? error.message : error); }
}
export async function ingest(request: Request, env: Env, options: Options = {}): Promise<Response> {
 const path = new URL(request.url).pathname;
 if(path==='/hooks/micropay/incoming'){
  if(!['GET','POST'].includes(request.method))throw new HttpError(405,'GET or POST required');
  await authorize(request,env.INCOMING_TOKEN,true);const parsed=await readMicropay(request);
  const stored=await store('in',parsed.event,env);await forward(env,stored,options);
  // The bot's answer, if any, goes back as the reply; a bot error only means no reply, never a failed callback.
  // Numbers whose messages come from a Micropay automation can't answer through the response, so their replies go
  // through the sending API after responding; the response then carries no reply, so nothing is sent twice.
  const viaApi=stored.botReply==='api';let reply:string|null=null;
  try{reply=await handleIncoming(env,{id:stored.id,inserted:stored.inserted,system:stored.system,peer:stored.peer,body:String(parsed.event.body)},viaApi?'pending':'accepted');}catch(error){console.error('Bot failed',error instanceof Error?error.message:error);}
  if(viaApi){if(reply&&stored.inserted){const run=botApiReply(env,stored,reply,options);if(options.waitUntil)options.waitUntil(run);else await run;}return micropayAcknowledgement(parsed.json,null);}
  return micropayAcknowledgement(parsed.json,reply);
 }
 const direction = path === '/hooks/incoming' ? 'in' : path === '/events/outgoing' ? 'out' : undefined;
 if (!direction) throw new HttpError(404, 'Not found'); if (request.method !== 'POST') throw new HttpError(405, 'POST required');
 await authorize(request, direction === 'in' ? env.INCOMING_TOKEN : env.OUTGOING_TOKEN);
 const stored = await store(direction, await readBody(request), env); if (direction === 'in') await forward(env, stored, options); return json(stored.response);
}
export default {
 async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> { try { return await ingest(request,env,ctx?{waitUntil:p=>ctx.waitUntil(p)}:{}); } catch (error) { return failure(error); } },
 // Cron trigger (every minute): sends one batch of a due scheduled send, or else retries forwarding deliveries. They
 // take turns because one invocation may make only 50 outgoing calls and 50 D1 queries on the free plan.
 async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  const fetcher: Fetch = (u,i) => fetch(u,i);
  ctx.waitUntil((async () => { const busy = await runScheduled(env,fetcher).catch(e => { console.error('Scheduled send failed', e instanceof Error ? e.message : e); return false; }); if (!busy) await runDue(env,fetcher); })());
 },
};

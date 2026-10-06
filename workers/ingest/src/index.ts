import {Env, HttpError, failure, json, phone, readBody, text, timestamp} from '../../../shared/validation';
import {readMicropay, micropayAcknowledgement} from './micropay';
import {DEFAULT_SETTINGS, isOptOut} from '../../../shared/settings';
async function equal(a: string, b: string): Promise<boolean> { const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); const [x,y] = await Promise.all([hash(a),hash(b)]); let difference = 0; for (let i=0;i<x.length;i++) difference |= x[i] ^ y[i]; return difference === 0; }
// Micropay can only be configured with a URL, so its route also accepts ?token=.
async function authorize(request: Request, expected: string | undefined, allowQuery = false): Promise<void> {
 if (!expected || expected.length < 32) throw new HttpError(503, 'Ingestion is not configured');
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1] ?? (allowQuery ? new URL(request.url).searchParams.get('token') : null);
 if (!token || !await equal(token, expected)) throw new HttpError(401, 'Invalid ingestion credential');
}
async function store(direction: 'in'|'out', body: Record<string, unknown>, env: Env) {
 const now = Date.now(); const system = phone(body.system_number);
 const registered = await env.DB.prepare('SELECT number FROM system_numbers WHERE number = ? AND active = 1').bind(system).first(); if (!registered) throw new HttpError(403, 'Unknown or inactive system number');
 const peer = phone(body.peer_number); const message = text(body.body, 'body', 10000);
 const eventId = body.event_id === undefined ? (direction === 'in' ? crypto.randomUUID() : text(body.event_id,'event_id',256)) : text(body.event_id,'event_id',256);
 const key = JSON.stringify([direction,eventId]); const occurred = timestamp(body.occurred_at, now); const timeSource = body.occurred_at === undefined ? 'receipt' : direction === 'in' ? 'provider' : 'workflow';
 const status = direction === 'out' ? text(body.submission_status,'submission_status',16) : null;
 if (status && !['pending','accepted','rejected','unknown'].includes(status)) throw new HttpError(400, 'Invalid submission_status');
 const providerId = body.provider_message_id === undefined ? null : text(body.provider_message_id,'provider_message_id',256);
 const sql = direction === 'in' ? `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING` : `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO UPDATE SET submission_status=excluded.submission_status, provider_message_id=COALESCE(excluded.provider_message_id,messages.provider_message_id), updated_at=CASE WHEN messages.submission_status != excluded.submission_status OR (excluded.provider_message_id IS NOT NULL AND COALESCE(messages.provider_message_id,'') != excluded.provider_message_id) THEN MAX(excluded.updated_at,messages.updated_at+1) ELSE messages.updated_at END WHERE messages.system_number=excluded.system_number AND messages.peer_number=excluded.peer_number AND messages.body=excluded.body AND (messages.submission_status IN ('pending','unknown') OR messages.submission_status=excluded.submission_status)`;
 await env.DB.prepare(sql).bind(key,direction,system,peer,message,occurred,now,timeSource,status,providerId,now).run();
 const stored = await env.DB.prepare('SELECT id,system_number,peer_number,body,submission_status FROM messages WHERE event_key = ?').bind(key).first<{id:number;system_number:string;peer_number:string;body:string;submission_status:string|null}>();
 if (!stored) throw new Error('Persistence failed');
 if (stored.system_number !== system || stored.peer_number !== peer || stored.body !== message) throw new HttpError(409, 'Event ID reused with different message content');
 if (direction === 'out' && status !== stored.submission_status && status !== 'pending' && status !== 'unknown') throw new HttpError(409, 'Conflicting final submission status');
 if (direction === 'in' && message.length <= 30) await optOut(env, peer, message);
 return {ok:true,id:stored.id,deduplicated_by_id:body.event_id !== undefined,submission_status:stored.submission_status};
}
// A customer who replies with an opt-out word is skipped by future dashboard sends. Never fails the ingestion itself:
// the message is already stored, and an error here must not make Micropay send the customer an error SMS.
async function optOut(env: Env, peer: string, message: string): Promise<void> {
 try { const row = await env.DB.prepare("SELECT value FROM settings WHERE key='optout_keywords'").first<{value:string}>(); const keywords = row ? JSON.parse(row.value) as string[] : DEFAULT_SETTINGS.optout_keywords;
  if (isOptOut(message, keywords)) await env.DB.prepare("INSERT INTO opt_outs (number,source,created_at) VALUES (?,'keyword',?) ON CONFLICT(number) DO NOTHING").bind(peer, Date.now()).run(); }
 catch (error) { console.error('Opt-out check failed', error instanceof Error ? error.message : error); }
}
export async function ingest(request: Request, env: Env): Promise<Response> {
 const path = new URL(request.url).pathname;
 if(path==='/hooks/micropay/incoming'){
  if(!['GET','POST'].includes(request.method))throw new HttpError(405,'GET or POST required');
  await authorize(request,env.INCOMING_TOKEN,true);const parsed=await readMicropay(request);
  await store('in',parsed.event,env);return micropayAcknowledgement(parsed.json);
 }
 const direction = path === '/hooks/incoming' ? 'in' : path === '/events/outgoing' ? 'out' : undefined;
 if (!direction) throw new HttpError(404, 'Not found'); if (request.method !== 'POST') throw new HttpError(405, 'POST required');
 await authorize(request, direction === 'in' ? env.INCOMING_TOKEN : env.OUTGOING_TOKEN);
 return json(await store(direction, await readBody(request), env));
}
export default {async fetch(request: Request, env: Env): Promise<Response> { try { return await ingest(request,env); } catch (error) { return failure(error); } }};

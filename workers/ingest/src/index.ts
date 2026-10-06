import {Env, HttpError, failure, json, phone, readBody, text, timestamp} from '../../../shared/validation';
import {readMicropay, micropayAcknowledgement} from './micropay';
type IngestEnv = Env & {MICROPAY_ALLOW_URL_TOKEN?:string};
type Credential = {token: string; source: string; direction: 'in' | 'out'; numbers: string[]};
async function equal(a: string, b: string): Promise<boolean> { const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); const [x,y] = await Promise.all([hash(a),hash(b)]); let difference = 0; for (let i=0;i<x.length;i++) difference |= x[i] ^ y[i]; return difference === 0; }
async function credential(request: Request, env: IngestEnv, direction: 'in'|'out', vendor=false): Promise<Credential> {
 if (!env.INGEST_CREDENTIALS_JSON) throw new HttpError(503, 'Ingestion is not configured');
 let credentials: Credential[]; try { credentials = JSON.parse(env.INGEST_CREDENTIALS_JSON); if (!Array.isArray(credentials) || credentials.some(c => !c || typeof c.token !== 'string' || c.token.length < 32 || typeof c.source !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(c.source) || !['in','out'].includes(c.direction) || !Array.isArray(c.numbers) || !c.numbers.length || c.numbers.some(n => typeof n !== 'string' || phone(n) !== n))) throw new Error(); if (new Set(credentials.map(c=>c.token)).size !== credentials.length) throw new Error(); } catch { throw new HttpError(503, 'Invalid ingestion configuration'); }
 const authorization=request.headers.get('authorization');const headerToken=authorization?.match(/^Bearer ([^\s]+)$/)?.[1];let token=headerToken;
 if(vendor){const values=new URL(request.url).searchParams.getAll('hook_token');if(values.length>1)throw new HttpError(400,'Duplicate credential parameter');if(values.length){if(env.MICROPAY_ALLOW_URL_TOKEN!=='true')throw new HttpError(401,'URL credentials are disabled');if(authorization && headerToken!==values[0])throw new HttpError(401,'Conflicting credentials');token=values[0];}}
 if (!token || token.length > 1024 || (authorization && !headerToken)) throw new HttpError(401, 'Invalid ingestion credential');
 for (const c of credentials) if (c.direction === direction && await equal(token,c.token)) return c;
 throw new HttpError(401, 'Invalid ingestion credential');
}
export async function ingest(request: Request, env: IngestEnv): Promise<Response> {
 const path = new URL(request.url).pathname;
 if(path==='/hooks/micropay/incoming'){
  if(!['GET','POST'].includes(request.method))throw new HttpError(405,'GET or POST required');
  const c=await credential(request,env,'in',true);const parsed=await readMicropay(request);
  const normalized=new Request('https://internal.invalid/hooks/incoming',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.token},body:JSON.stringify(parsed.event)});
  await ingest(normalized,env);return micropayAcknowledgement(parsed.json);
 }
 const direction = path === '/hooks/incoming' ? 'in' : path === '/events/outgoing' ? 'out' : undefined;
 if (!direction) throw new HttpError(404, 'Not found'); if (request.method !== 'POST') throw new HttpError(405, 'POST required');
 const c = await credential(request, env, direction); const body = await readBody(request); const now = Date.now();
 const system = body.system_number === undefined && c.numbers.length === 1 ? c.numbers[0] : phone(body.system_number);
 if (!c.numbers.includes(system)) throw new HttpError(403, 'Number outside credential scope');
 const registered = await env.DB.prepare('SELECT number FROM system_numbers WHERE number = ? AND active = 1').bind(system).first(); if (!registered) throw new HttpError(403, 'Unknown or inactive system number');
 const peer = phone(body.peer_number); const message = text(body.body, 'body', 10000);
 const eventId = body.event_id === undefined ? (direction === 'in' ? crypto.randomUUID() : text(body.event_id,'event_id',256)) : text(body.event_id,'event_id',256);
 const key = JSON.stringify([direction,c.source,eventId]); const occurred = timestamp(body.occurred_at, now); const timeSource = body.occurred_at === undefined ? 'receipt' : direction === 'in' ? 'provider' : 'workflow';
 const status = direction === 'out' ? text(body.submission_status,'submission_status',16) : null;
 if (status && !['pending','accepted','rejected','unknown'].includes(status)) throw new HttpError(400, 'Invalid submission_status');
 const providerId = body.provider_message_id === undefined ? null : text(body.provider_message_id,'provider_message_id',256);
 const sql = direction === 'in' ? `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING` : `INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO UPDATE SET submission_status=excluded.submission_status, provider_message_id=COALESCE(excluded.provider_message_id,messages.provider_message_id), updated_at=CASE WHEN messages.submission_status != excluded.submission_status OR (excluded.provider_message_id IS NOT NULL AND COALESCE(messages.provider_message_id,'') != excluded.provider_message_id) THEN MAX(excluded.updated_at,messages.updated_at+1) ELSE messages.updated_at END WHERE messages.system_number=excluded.system_number AND messages.peer_number=excluded.peer_number AND messages.body=excluded.body AND (messages.submission_status IN ('pending','unknown') OR messages.submission_status=excluded.submission_status)`;
 await env.DB.prepare(sql).bind(key,direction,system,peer,message,occurred,now,timeSource,status,providerId,now).run();
 const stored = await env.DB.prepare('SELECT id,system_number,peer_number,body,submission_status FROM messages WHERE event_key = ?').bind(key).first<{id:number;system_number:string;peer_number:string;body:string;submission_status:string|null}>();
 if (!stored) throw new Error('Persistence failed');
 if (stored.system_number !== system || stored.peer_number !== peer || stored.body !== message) throw new HttpError(409, 'Event ID reused with different message content');
 if (direction === 'out' && status !== stored.submission_status && status !== 'pending' && status !== 'unknown') throw new HttpError(409, 'Conflicting final submission status');
 return json({ok:true,id:stored.id,deduplicated_by_id:body.event_id !== undefined,submission_status:stored.submission_status});
}
export default {async fetch(request: Request, env: IngestEnv): Promise<Response> { try { return await ingest(request,env); } catch (error) { return failure(error); } }};

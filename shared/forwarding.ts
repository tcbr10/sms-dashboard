import {Env} from './validation';
// Forwarding of incoming messages to admin-configured webhooks. Ingest queues a delivery per matching rule and tries it
// right away; failures are retried by the ingest Worker's once-a-minute timer with growing gaps, up to MAX_ATTEMPTS.
// Forwarding never affects storing a message or the answer Micropay gets.
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export const MAX_ATTEMPTS = 10;
// Minutes to wait after attempt n (1-based) fails; the last attempt happens about a day after the first.
const RETRY_MINUTES = [1, 5, 15, 60, 120, 240, 360, 360, 480];
const PER_RUN = 10; // the free plan allows 50 D1 queries per invocation, and each delivery uses three
type Row = {id:number;attempts:number;url:string;format:'json'|'micropay';headers:string;secret:string;message_id:number;event_key:string;system_number:string;peer_number:string;body:string;occurred_at:number;received_at:number;label:string|null;contact:string|null};
export type Outcome = {ok:boolean;status:number|null;error:string|null};

async function hmac(secret: string, body: string): Promise<string> {
 const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const localNumber = (n: string) => n.startsWith('+972') ? '0' + n.slice(4) : n.replace(/^\+/, '');
// Micropay's own message ID when the message came through its webhook, otherwise the dashboard's message ID.
function msgid(m: Pick<Row,'event_key'|'message_id'>): string { try { const k = JSON.parse(m.event_key); if (Array.isArray(k) && k.length === 2 && typeof k[1] === 'string') return k[1]; } catch { /* fall through */ } return String(m.message_id); }

// Builds the request for one message. "json" is this dashboard's format; "micropay" repeats Micropay's incoming-SMS
// webhook fields as a form post, so a system built for that webhook can receive it unchanged.
export async function buildRequest(rule: Pick<Row,'format'|'headers'|'secret'>, m: Omit<Row,'id'|'attempts'|'url'|'format'|'headers'|'secret'>, delivery: number|string, test = false): Promise<RequestInit> {
 let body: string; let type: string;
 if (rule.format === 'micropay') { body = new URLSearchParams({origsms:m.body, phone:localNumber(m.peer_number), dest:localNumber(m.system_number), msgid:msgid(m)}).toString(); type = 'application/x-www-form-urlencoded; charset=utf-8'; }
 else {
  let contact: unknown = null; try { contact = m.contact ? JSON.parse(m.contact) : null; } catch { /* leave it out */ }
  body = JSON.stringify({event:'sms.incoming', ...(test ? {test:true} : {}), id:m.message_id, msgid:msgid(m), system_number:m.system_number, system_label:m.label, from:m.peer_number, body:m.body, occurred_at:new Date(m.occurred_at).toISOString(), received_at:new Date(m.received_at).toISOString(), contact});
  type = 'application/json; charset=utf-8';
 }
 let extra: Record<string,string> = {}; try { extra = JSON.parse(rule.headers || '{}'); } catch { /* validated when saved */ }
 return {method:'POST', body, headers:{...extra, 'Content-Type':type, 'User-Agent':'sms-dashboard-forwarder', 'X-SMS-Delivery':String(delivery), 'X-SMS-Signature':'sha256=' + await hmac(rule.secret, body)}, signal:AbortSignal.timeout(10000)};
}
export async function attempt(fetcher: Fetch, url: string, init: RequestInit): Promise<Outcome> {
 try { const r = await fetcher(url, init); if (r.ok) return {ok:true, status:r.status, error:null}; return {ok:false, status:r.status, error:(await r.text().catch(() => '')).slice(0, 300) || 'HTTP ' + r.status}; }
 catch (e) { return {ok:false, status:null, error:e instanceof Error && e.name === 'TimeoutError' ? 'No answer within 10 seconds' : (e instanceof Error ? e.message : 'Request failed').slice(0, 300)}; }
}

// Queues one delivery per active rule of this number whose sender list is empty or includes the sender.
export async function enqueue(env: Env, messageId: number, system: string, peer: string): Promise<number[]> {
 const now = Date.now();
 return (await env.DB.prepare("INSERT INTO deliveries (rule_id,message_id,status,attempts,next_at,created_at,updated_at) SELECT id,?1,'pending',0,?2,?2,?2 FROM forward_rules WHERE active=1 AND system_number=?3 AND (senders='[]' OR EXISTS (SELECT 1 FROM json_each(senders) WHERE value=?4)) ON CONFLICT(rule_id,message_id) DO NOTHING RETURNING id").bind(messageId, now, system, peer).all<{id:number}>()).results.map(r => r.id);
}
// Tries one due delivery. The claim moves next_at a minute ahead first, so the timer and an immediate try never send
// the same delivery twice at once.
export async function deliver(env: Env, fetcher: Fetch, id: number): Promise<Outcome|null> {
 const now = Date.now();
 const claimed = await env.DB.prepare("UPDATE deliveries SET next_at=? WHERE id=? AND status='pending' AND next_at<=? RETURNING id").bind(now + 60000, id, now).first();
 if (!claimed) return null;
 const row = await env.DB.prepare('SELECT d.id,d.attempts,r.url,r.format,r.headers,r.secret,r.active,m.id AS message_id,m.event_key,m.system_number,m.peer_number,m.body,m.occurred_at,m.received_at,s.label,c.data AS contact FROM deliveries d JOIN forward_rules r ON r.id=d.rule_id JOIN messages m ON m.id=d.message_id LEFT JOIN system_numbers s ON s.number=m.system_number LEFT JOIN contacts c ON c.number=m.peer_number WHERE d.id=?').bind(id).first<Row & {active:number}>();
 const result: Outcome = !row ? {ok:false, status:null, error:'The rule or message no longer exists'} : !row.active ? {ok:false, status:null, error:'The rule is turned off'} : await attempt(fetcher, row.url, await buildRequest(row, row, id));
 const attempts = (row?.attempts ?? MAX_ATTEMPTS) + 1; const final = result.ok || !row?.active || attempts >= MAX_ATTEMPTS;
 await env.DB.prepare('UPDATE deliveries SET status=?,attempts=?,next_at=?,last_status=?,last_error=?,updated_at=? WHERE id=?')
  .bind(result.ok ? 'delivered' : final ? 'failed' : 'pending', attempts, final ? null : Date.now() + RETRY_MINUTES[Math.min(attempts, RETRY_MINUTES.length) - 1] * 60000, result.status, result.error, Date.now(), id).run();
 return result;
}
// Called by the ingest Worker's cron trigger every minute.
export async function runDue(env: Env, fetcher: Fetch): Promise<number> {
 const due = (await env.DB.prepare("SELECT id FROM deliveries WHERE status='pending' AND next_at<=? ORDER BY next_at LIMIT ?").bind(Date.now(), PER_RUN).all<{id:number}>()).results;
 for (const d of due) await deliver(env, fetcher, d.id).catch(e => console.error('Delivery failed', d.id, e instanceof Error ? e.message : e));
 return due.length;
}

// Local UI preview (npm run preview): the real dashboard router, data layer and ingest Worker against an in-memory
// Miniflare D1 with seeded messages, since the deployed dashboard requires Cloudflare Access. Micropay is faked, so
// nothing is ever sent. PREVIEW_USER picks the signed-in email (default the admin; agent@example.com is a regular user).
import {createServer} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {handle} from '../workers/dashboard/src/index';
import ingestion from '../workers/ingest/src/index';
import {failure} from '../shared/validation';

const migrations = new URL('../migrations/', import.meta.url);
const token = 'p'.repeat(40), out = 'q'.repeat(40), email = process.env.PREVIEW_USER || 'preview@example.com';
const mf = new Miniflare({modules: true, script: 'export default {fetch(){return new Response("x")}}', compatibilityDate: '2026-08-06', d1Databases: {DB: 'preview'}});
const env = {DB: (await mf.getBindings()).DB as D1Database, INCOMING_TOKEN: token, OUTGOING_TOKEN: out, MICROPAY_TOKEN: 'preview'};
for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort()) for (const sql of (await readFile(new URL(file, migrations), 'utf8')).split(';').filter(s => s.trim())) await env.DB.prepare(sql).run();
await env.DB.batch([
 env.DB.prepare("INSERT INTO system_numbers VALUES ('+972501234567','משרד',1),('+972501234568','מכירות',1)"),
 env.DB.prepare("INSERT INTO users (email,name,role,can_bulk_send,created_at) VALUES ('preview@example.com','מנהלת לדוגמה','admin',1,1),('agent@example.com','נציג לדוגמה','user',0,1)"),
 env.DB.prepare("INSERT INTO user_numbers (email,system_number,can_send) VALUES ('agent@example.com','+972501234567',1),('agent@example.com','+972501234568',0)"),
]);
const peers = ['+972509876543', '+972521234567', '+972546667788', '+972587654321', '+97235551234', '+447700900123'];
const texts = ['שלום, אפשר פרטים על המבצע?', 'תודה רבה! מגיע מחר בעשר', 'האם אתם פתוחים בשבת?', 'אני רוצה לבטל את התור של יום ראשון', 'קיבלתי, תודה 🙏', 'כמה עולה המשלוח לחיפה?', 'Hi, is this the right number for support?', 'אפשר לקבל חשבונית במייל?\nתודה, דנה', 'הסר', 'מעולה, נתראה'];
const replies = ['שלום! המבצע בתוקף עד סוף החודש. לפרטים: 03-5551234', 'התור שלך נקבע ליום שני ב-10:00', 'המשלוח לחיפה עולה 35 ₪', 'החשבונית נשלחה למייל 👍'];
const statuses = ['accepted', 'accepted', 'accepted', 'pending', 'rejected', 'unknown'];
const now = Date.now();
let n = 0;
async function post(path: string, secret: string, body: Record<string, unknown>) {
 const r = await ingestion.fetch(new Request('https://ingest.local' + path, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + secret}, body: JSON.stringify(body)}), env as never);
 if (!r.ok) console.error(path, r.status, await r.text());
}
for (let i = 0; i < 160; i++) {
 const at = new Date(now - (160 - i) * 47 * 60 * 1000).toISOString(); const outgoing = i % 3 === 2;
 const system = i % 5 === 0 ? '+972501234568' : '+972501234567'; const peer = peers[i % peers.length];
 if (outgoing) await post('/events/outgoing', out, {event_id: 'seed-' + i, system_number: system, peer_number: peer, body: replies[i % replies.length], occurred_at: at, submission_status: statuses[i % statuses.length]});
 else await post('/hooks/incoming', token, {event_id: 'seed-' + i, system_number: system, peer_number: peer, body: texts[i % texts.length], occurred_at: at});
}
// A new incoming message every 6 seconds, and a pending outgoing message that gets accepted, to exercise live updates.
setInterval(async () => {
 n++; const peer = peers[n % peers.length];
 await post('/hooks/incoming', token, {event_id: 'live-' + n, system_number: '+972501234567', peer_number: peer, body: 'הודעה חיה מספר ' + n + ' — ' + texts[n % texts.length]});
 if (n % 2) { await post('/events/outgoing', out, {event_id: 'live-out-' + n, system_number: '+972501234567', peer_number: peer, body: 'תשובה אוטומטית ' + n, submission_status: 'pending'}); setTimeout(() => post('/events/outgoing', out, {event_id: 'live-out-' + n, system_number: '+972501234567', peer_number: peer, body: 'תשובה אוטומטית ' + n, submission_status: 'accepted'}), 7000); }
}, 6000);
// Fake Micropay: accepts every send and logs it without the token.
let task = 1000;
const fakeMicropay = async (_url: string, init: RequestInit) => { const {token: _, ...request} = JSON.parse(String(init.body)); console.log('[fake Micropay]', JSON.stringify(request)); return new Response('OK ' + (++task)); };

const port = Number(process.env.PORT || 8791);
createServer(async (req, res) => {
 const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk as Buffer);
 const url = 'http://localhost:' + port + (req.url || '/');
 const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
 let response: Response;
 try { response = await handle(new Request(url, {method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined}), env, email, fakeMicropay); }
 catch (error) { response = failure(error); }
 res.writeHead(response.status, Object.fromEntries(response.headers));
 res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log('preview on http://localhost:' + port + ' as ' + email));

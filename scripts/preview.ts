// Local UI preview (npm run preview): the real page, data layer and ingest Worker against an in-memory
// Miniflare D1 with seeded messages and a fake signed-in user, since the deployed dashboard requires Cloudflare Access.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {page} from '../workers/dashboard/src/page';
import {data} from '../workers/dashboard/src/data';
import ingestion from '../workers/ingest/src/index';
import {failure} from '../shared/validation';

const migration = new URL('../migrations/0001_initial.sql', import.meta.url);
const token = 'p'.repeat(40), out = 'q'.repeat(40), email = 'preview@example.com';
const mf = new Miniflare({modules: true, script: 'export default {fetch(){return new Response("x")}}', compatibilityDate: '2026-08-06', d1Databases: {DB: 'preview'}});
const env = {DB: (await mf.getBindings()).DB as D1Database, INCOMING_TOKEN: token, OUTGOING_TOKEN: out};
for (const sql of (await readFile(migration, 'utf8')).split(';').filter(s => s.trim())) await env.DB.prepare(sql).run();
await env.DB.batch([
 env.DB.prepare("INSERT INTO system_numbers VALUES ('+972501234567','משרד',1),('+972501234568','מכירות',1)"),
 env.DB.prepare('INSERT INTO user_numbers VALUES (?,?),(?,?)').bind(email, '+972501234567', email, '+972501234568'),
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

const port = Number(process.env.PORT || 8791);
createServer(async (req, res) => {
 const url = new URL(req.url || '/', 'http://localhost:' + port);
 let response: Response;
 try {
  if (url.pathname.startsWith('/api/')) response = await data(url, env as never, email);
  else if (url.pathname === '/') { const nonce = crypto.randomUUID().replace(/-/g, ''); response = new Response(page(nonce), {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}}); }
  else response = new Response('Not found', {status: 404});
 } catch (error) { response = failure(error); }
 res.writeHead(response.status, Object.fromEntries(response.headers));
 res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log('preview on http://localhost:' + port));

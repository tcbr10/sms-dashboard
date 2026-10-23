import {Env,HttpError,json,phone,encodeCursor,decodeCursor} from '../../../shared/validation';
import {parseFlow,Flow} from '../../../shared/bot';
import {User,numbersFor} from './users';
import {scope,seesCustomer} from './scope';
import {phoneNeedle} from './data';
// Bot chats page. GET /api/chats lists bot threads (bot_threads, one per customer and number) newest activity first;
// GET /api/chats/counts counts them by state and lists the flows for the filter; GET /api/chats/thread returns one thread's bot state, answers and the
// flows of its number. The messages themselves come from /api/messages (system_number + peer_number), so the same
// visibility rules and live updates apply. A thread is listed only when the user can see at least one of its messages.
const STATES = ['active','done','blocked','opted_out'] as const;
type State = typeof STATES[number];
// Derived when read, so a conversation that expires changes state without a write.
const STATE = `CASE WHEN EXISTS (SELECT 1 FROM bot_blocks b WHERE b.system_number=t.system_number AND b.peer_number=t.peer_number) THEN 'blocked'
 WHEN EXISTS (SELECT 1 FROM opt_outs o WHERE o.number=t.peer_number) THEN 'opted_out'
 WHEN EXISTS (SELECT 1 FROM conversations v WHERE v.system_number=t.system_number AND v.peer_number=t.peer_number AND v.expires_at>?) THEN 'active' ELSE 'done' END`;
type Built = {sql:string;bindings:(string|number)[]};
// The threads of the user's numbers matching the flow and search filters, with their state and (when last is set) the
// latest message the user may see. Conditions on the visible-message subquery come from scope().
async function threads(p: URLSearchParams, env: Env, user: User, select: 'list'|'count'): Promise<Built> {
 const numbers = (await numbersFor(env,user)).map(n => n.number); const s = await scope(env,user); const now = Date.now();
 const visible = `FROM messages m WHERE m.system_number=t.system_number AND m.peer_number=t.peer_number AND ${s.sql}`;
 const cols = select === 'list'
  ? `t.id,t.system_number,t.peer_number,t.flow_id,f.name AS flow,t.started_at,t.last_at,t.updated_at,c.data AS contact,(SELECT json_object('body',m.body,'direction',m.direction,'at',m.occurred_at,'by',m.sent_by) ${visible} ORDER BY m.occurred_at DESC,m.id DESC LIMIT 1) AS last,${STATE} AS state`
  : `EXISTS (SELECT 1 ${visible}) AS last,${STATE} AS state`;
 const conditions = ['t.system_number IN (SELECT value FROM json_each(?))']; const bindings: (string|number)[] = [...s.bindings,now,JSON.stringify(numbers)];
 const flow = p.get('flow'); if (flow) { if (!/^\d{1,9}$/.test(flow)) throw new HttpError(400,'Invalid flow'); conditions.push('t.flow_id=?'); bindings.push(Number(flow)); }
 const q = p.get('q'); if (q) { if (q.length > 200) throw new HttpError(400,'Search too long'); conditions.push('(instr(t.peer_number,?)>0 OR EXISTS (SELECT 1 FROM json_each(c.data) j WHERE instr(lower(j.value),lower(?))>0))'); bindings.push(phoneNeedle(q),q); }
 return {sql:`SELECT ${cols} FROM bot_threads t LEFT JOIN flows f ON f.id=t.flow_id LEFT JOIN contacts c ON c.number=t.peer_number WHERE ${conditions.join(' AND ')}`,bindings};
}
function states(p: URLSearchParams): State[] { const raw = p.get('state'); if (!raw) return []; const v = [...new Set(raw.split(','))]; if (v.some(x => !STATES.includes(x as State))) throw new HttpError(400,'Invalid state'); return v as State[]; }
type Row = {id:number;updated_at:number;contact:string|null;last:string|null;[key:string]:unknown};
export async function chats(url: URL, env: Env, user: User): Promise<Response> {
 const p = url.searchParams;
 if (url.pathname === '/api/chats/thread') return thread(p,env,user);
 if (url.pathname === '/api/chats/counts') {
  const t = await threads(p,env,user,'count');
  const numbers = (await numbersFor(env,user)).map(n => n.number);
  const [rows,flows] = await Promise.all([env.DB.prepare(`SELECT state,COUNT(*) AS n FROM (${t.sql}) WHERE last GROUP BY state`).bind(...t.bindings).all<{state:State;n:number}>(),
   env.DB.prepare('SELECT id,name,system_number FROM flows WHERE system_number IN (SELECT value FROM json_each(?)) ORDER BY name').bind(JSON.stringify(numbers)).all()]);
  return json({counts:Object.fromEntries(STATES.map(s => [s,rows.results.find(r => r.state === s)?.n ?? 0])),flows:flows.results});
 }
 if (url.pathname !== '/api/chats') throw new HttpError(404,'Not found');
 const limit = Number(p.get('limit') || 50); if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400,'Invalid limit');
 const updates = p.has('since'); if (updates && p.has('cursor')) throw new HttpError(400,'Use cursor or since, not both');
 const cursor = decodeCursor(updates ? p.get('since') : p.get('cursor')); if (updates && !cursor) throw new HttpError(400,'since requires a cursor');
 const t = await threads(p,env,user,'list'); const outer: string[] = ['last IS NOT NULL']; const bindings = [...t.bindings];
 // Live updates return every changed thread whatever its state, so the page can drop one that left the state filter.
 const wanted = updates ? [] : states(p); if (wanted.length) { outer.push('state IN (SELECT value FROM json_each(?))'); bindings.push(JSON.stringify(wanted)); }
 const dir = updates ? 'ASC' : 'DESC'; const op = updates ? '>' : '<';
 if (cursor) { outer.push(`updated_at ${op}= ? AND (updated_at ${op} ? OR id ${op} ?)`); bindings.push(cursor.t,cursor.t,cursor.id); }
 const syncStart = Date.now() - 1;
 const rows = (await env.DB.prepare(`SELECT * FROM (${t.sql}) WHERE ${outer.join(' AND ')} ORDER BY updated_at ${dir},id ${dir} LIMIT ?`).bind(...bindings,limit+1).all<Row>()).results;
 const more = rows.length > limit; const page = rows.slice(0,limit); const last = page.at(-1); const next = last ? encodeCursor({t:last.updated_at,id:last.id}) : null;
 return json({threads:page.map(r => ({...r,contact:r.contact ? JSON.parse(r.contact) : null,last:r.last ? JSON.parse(r.last) : null})),has_more:more,next_cursor:more ? next : null,sync_cursor:updates ? (next || p.get('since')) : encodeCursor({t:syncStart,id:0})});
}
// One thread's state for the side panel: the running conversation, a bot block, opt-out, the answers the user may see
// (answers to messages outside their view are left out) and the flows of the number, for the questions' options.
async function thread(p: URLSearchParams, env: Env, user: User): Promise<Response> {
 const system = phone(p.get('system_number')); const peer = phone(p.get('peer_number'));
 if (!(await numbersFor(env,user)).some(n => n.number === system) || !await seesCustomer(env,user,system,peer)) throw new HttpError(404,'Conversation not found');
 const s = await scope(env,user);
 const [row,conversation,blocked,optedOut,contact,answers,flows] = await Promise.all([
  env.DB.prepare('SELECT flow_id,started_at,last_at FROM bot_threads WHERE system_number=? AND peer_number=?').bind(system,peer).first(),
  env.DB.prepare('SELECT flow_id,step,retries,started_at,expires_at FROM conversations WHERE system_number=? AND peer_number=? AND expires_at>?').bind(system,peer,Date.now()).first(),
  env.DB.prepare('SELECT created_by,created_at FROM bot_blocks WHERE system_number=? AND peer_number=?').bind(system,peer).first(),
  env.DB.prepare('SELECT source,created_at FROM opt_outs WHERE number=?').bind(peer).first(),
  env.DB.prepare('SELECT data FROM contacts WHERE number=?').bind(peer).first<{data:string}>(),
  env.DB.prepare(`SELECT a.flow_id,a.step,a.question,a.answer,a.meaning,a.message_id,a.at FROM bot_answers a JOIN messages m ON m.id=a.message_id LEFT JOIN contacts c ON c.number=m.peer_number WHERE a.system_number=? AND a.peer_number=? AND ${s.sql} ORDER BY a.id LIMIT 500`).bind(system,peer,...s.bindings).all(),
  env.DB.prepare('SELECT * FROM flows WHERE system_number=?').bind(system).all<Omit<Flow,'steps'> & {steps:string}>(),
 ]);
 return json({thread:row,conversation,blocked,opted_out:optedOut,contact:contact ? JSON.parse(contact.data) : null,answers:answers.results,
  flows:flows.results.map(parseFlow).map(f => ({id:f.id,name:f.name,active:f.active,steps:f.steps.map(x => ({id:x.id,text:x.text,type:x.type,options:x.options ?? []}))}))});
}

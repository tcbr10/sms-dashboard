import {Env,HttpError,json,phone,encodeCursor,decodeCursor} from '../../../shared/validation';
import {ContactField,loadSettings} from '../../../shared/settings';
import {User,audit} from './users';
type Row = {id:number;sort_key:number|string;contact:string|null;[key:string]:unknown};
// Every message query joins the customer's contact data and the send that produced it (for test sends).
const FROM = 'messages m LEFT JOIN contacts c ON c.number=m.peer_number LEFT JOIN sends s ON s.id=m.send_id';
// Counts join contacts only when a search or contact filter needs them; D1 bills every joined row read.
const COUNT_FROM = 'messages m LEFT JOIN contacts c ON c.number=m.peer_number';
const columns = 'm.id,m.direction,m.system_number,m.peer_number,m.body,m.occurred_at,m.received_at,m.time_source,m.submission_status,m.provider_message_id,m.updated_at,m.sent_by,m.import_id,c.data AS contact,COALESCE(s.is_test,0) AS is_test';
// Whitelisted sort expressions. Incoming rows have no status or sender, so they sort as ''.
const sorts: Record<string,string> = {time:'m.occurred_at',received:'m.received_at',direction:'m.direction',peer:'m.peer_number',number:'m.system_number',status:"COALESCE(m.submission_status,'')",sent_by:"COALESCE(m.sent_by,'')"};
const numeric = new Set(['time','received']);
// Contact field IDs are validated in settings (lowercase letters, digits, underscores), so they are safe inside a JSON path.
const contactExpr = (id: string) => `COALESCE(json_extract(c.data,'$.${id}'),'')`;
function choice<T extends string>(p: URLSearchParams, name: string, allowed: readonly T[]): T | undefined { const value=p.get(name); if (value===null) return undefined; if (!allowed.includes(value as T)) throw new HttpError(400,'Invalid '+name); return value as T; }
function list<T extends string>(p: URLSearchParams, name: string, allowed: readonly T[]): T[] { const raw=p.get(name); if (!raw) return []; const values=[...new Set(raw.split(','))]; if (values.some(v => !allowed.includes(v as T))) throw new HttpError(400,'Invalid '+name); return values as T[]; }
function contains(p: URLSearchParams, name: string): string|null { const v=p.get(name); if (!v) return null; if (v.length>200) throw new HttpError(400,'Filter too long'); return v; }
// Customer numbers are stored as +972…; a search typed in local form (05…) is matched against that.
const phoneNeedle = (v: string) => { const d=v.replace(/[^0-9+]/g,''); return d.startsWith('0') ? '+972'+d.slice(1) : d || v; };
// Admins see every active number; users only the numbers assigned to them. The allowed numbers are an uncorrelated IN
// subquery, evaluated once per query instead of once per message row. The leading + keeps SQLite from choosing the
// per-number index for this condition, which would read every message of those numbers and sort them.
async function filters(p: URLSearchParams, env: Env, user: User, fields: ContactField[]): Promise<{conditions:string[];bindings:(string|number)[]}> {
 const admin=user.role==='admin';
 const conditions=[admin?'+m.system_number IN (SELECT sn.number FROM system_numbers sn WHERE sn.active=1)':'+m.system_number IN (SELECT u.system_number FROM user_numbers u JOIN system_numbers sn ON sn.number=u.system_number WHERE u.email=? AND sn.active=1)']; const bindings: (string|number)[]=admin?[]:[user.email];
 const numbers=(p.get('system_number')||'').split(',').filter(Boolean); if (numbers.length) { if (numbers.length>50) throw new HttpError(400,'Too many numbers'); const wanted=[...new Set(numbers.map(n=>phone(n)))];
  const allowed=(admin?await env.DB.prepare('SELECT number FROM system_numbers WHERE active=1 AND number IN (SELECT value FROM json_each(?))').bind(JSON.stringify(wanted)).all():await env.DB.prepare('SELECT u.system_number FROM user_numbers u JOIN system_numbers sn ON sn.number=u.system_number WHERE u.email=? AND sn.active=1 AND u.system_number IN (SELECT value FROM json_each(?))').bind(user.email,JSON.stringify(wanted)).all()).results.length;
  if (allowed!==wanted.length) throw new HttpError(403,'System number is not assigned'); conditions.push('m.system_number IN (SELECT value FROM json_each(?))');bindings.push(JSON.stringify(wanted)); }
 if (p.has('peer_number')) { conditions.push('m.peer_number=?');bindings.push(phone(p.get('peer_number'))); }
 const query=contains(p,'q'); if (query) { conditions.push('(instr(lower(m.body),lower(?))>0 OR instr(m.peer_number,?)>0 OR EXISTS (SELECT 1 FROM json_each(c.data) j WHERE instr(lower(j.value),lower(?))>0))');bindings.push(query,phoneNeedle(query),query); }
 for(const [param,op] of [['from','>='],['to','<']] as const) if(p.has(param)) { const raw=p.get(param)!; if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))) throw new HttpError(400,'Invalid date filter'); conditions.push('m.occurred_at '+op+' ?');bindings.push(Number(raw)); }
 const directions=list(p,'direction',['in','out']); if (directions.length===1) { conditions.push('m.direction=?');bindings.push(directions[0]); }
 const statuses=list(p,'status',['pending','accepted','rejected','unknown']); if (statuses.length) { conditions.push('m.submission_status IN (SELECT value FROM json_each(?))');bindings.push(JSON.stringify(statuses)); }
 const peer=contains(p,'peer_q'); if (peer) { conditions.push('instr(m.peer_number,?)>0');bindings.push(phoneNeedle(peer)); }
 const body=contains(p,'body_q'); if (body) { conditions.push('instr(lower(m.body),lower(?))>0');bindings.push(body); }
 const by=contains(p,'by_q'); if (by) { conditions.push("instr(lower(COALESCE(m.sent_by,'')),lower(?))>0");bindings.push(by); }
 for (const f of fields) { const v=contains(p,'cf_'+f.id); if (v) { conditions.push('instr(lower('+contactExpr(f.id)+'),lower(?))>0');bindings.push(v); } }
 return {conditions,bindings};
}
export async function data(url: URL, env: Env, user: User): Promise<Response> {
 const p=url.searchParams; const fields=(await loadSettings(env.DB)).contact_fields;
 if (url.pathname === '/api/stats') { const {conditions,bindings}=await filters(p,env,user,fields); const from=conditions.some(c=>c.includes('c.data'))?COUNT_FROM:'messages m'; return json(await env.DB.prepare(`SELECT COUNT(*) AS total,COALESCE(SUM(m.direction='in'),0) AS incoming,COALESCE(SUM(m.direction='out'),0) AS outgoing,COUNT(DISTINCT m.peer_number) AS peers,COALESCE(MAX(m.id),0) AS max_id FROM ${from} WHERE ${conditions.join(' AND ')}`).bind(...bindings).first()); }
 if (url.pathname !== '/api/messages') throw new HttpError(404,'Not found');
 const {conditions,bindings}=await filters(p,env,user,fields);
 const sort=p.get('sort') || 'time'; const field=sort.startsWith('c:')?fields.find(f=>'c:'+f.id===sort):undefined; const sortExpr=sorts[sort] ?? (field?contactExpr(field.id):undefined); if (!sortExpr) throw new HttpError(400,'Invalid sort');
 const order=choice(p,'order',['asc','desc']) ?? 'desc'; const exporting=p.get('export')==='1';
 const limit=Number(p.get('limit') || 50); if(!Number.isInteger(limit)||limit<1||limit>(exporting?500:100)) throw new HttpError(400,'Invalid limit');
 const updates=p.has('since'); if(updates && p.has('cursor')) throw new HttpError(400,'Use cursor or since, not both');
 const cursor=updates?decodeCursor(p.get('since')):decodeCursor(p.get('cursor'),!numeric.has(sort)); if(updates&&!cursor) throw new HttpError(400,'since requires a cursor');
 const expr=updates?'m.updated_at':sortExpr; const dir=updates||order==='asc'?'ASC':'DESC'; const op=dir==='ASC'?'>':'<';
 // Written as "expr >= t AND (expr > t OR id > n)" rather than "expr > t OR (expr = t AND id > n)": the leading range
 // lets SQLite seek in the index, where the plain OR made every poll walk the index from the start.
 if(cursor) {conditions.push(`${expr} ${op}= ? AND (${expr} ${op} ? OR m.id ${op} ?)`);bindings.push(cursor.t,cursor.t,cursor.id);}
 // The first page of an export is recorded with its filters and columns.
 if (exporting && !p.has('cursor')) { const filtersUsed=Object.fromEntries([...p].filter(([k])=>!['export','limit','sort','order','columns','format'].includes(k))); await audit(env,user.email,'export',null,{filters:filtersUsed,columns:(p.get('columns')||'').split(',').filter(Boolean).slice(0,30),format:p.get('format')==='csv'?'csv':'xlsx'}).run(); }
 const syncStart=Date.now()-1;
 // Live updates always seek by update time; other filters (a number, a customer) must not pull them onto another index.
 const from=updates?FROM.replace('messages m','messages m INDEXED BY idx_messages_updates'):FROM;
 const result=await env.DB.prepare(`SELECT ${columns},${expr} AS sort_key FROM ${from} WHERE ${conditions.join(' AND ')} ORDER BY ${expr} ${dir},m.id ${dir} LIMIT ?`).bind(...bindings,limit+1).all<Row>();
 const more=result.results.length>limit; const page=result.results.slice(0,limit); const last=page.at(-1);
 const next=last?encodeCursor({t:last.sort_key,id:last.id}):null;
 return json({messages:page.map(({sort_key,contact,...m})=>({...m,contact:contact?JSON.parse(contact):null})),has_more:more,next_cursor:more?next:null,sync_cursor:updates?(next||p.get('since')):encodeCursor({t:syncStart,id:0})});
}

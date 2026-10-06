import {Env,HttpError,json,phone,encodeCursor,decodeCursor} from '../../../shared/validation';
import {User} from './users';
type Row = {id:number;sort_key:number|string;[key:string]:unknown};
// Whitelisted sort expressions; incoming rows have no submission status, so they sort as ''.
const sorts = {time:'m.occurred_at',direction:'m.direction',peer:'m.peer_number',number:'m.system_number',status:"COALESCE(m.submission_status,'')"} as const;
const columns = 'm.id,m.direction,m.system_number,m.peer_number,m.body,m.occurred_at,m.received_at,m.time_source,m.submission_status,m.provider_message_id,m.updated_at,m.sent_by';
function choice<T extends string>(p: URLSearchParams, name: string, allowed: readonly T[]): T | undefined { const value=p.get(name); if (value===null) return undefined; if (!allowed.includes(value as T)) throw new HttpError(400,'Invalid '+name); return value as T; }
// Admins see every active number; users only the numbers assigned to them.
async function filters(p: URLSearchParams, env: Env, user: User): Promise<{conditions:string[];bindings:(string|number)[]}> {
 const admin=user.role==='admin';
 const conditions=[admin?'EXISTS (SELECT 1 FROM system_numbers s WHERE s.number=m.system_number AND s.active=1)':'EXISTS (SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=m.system_number AND s.active=1)']; const bindings: (string|number)[]=admin?[]:[user.email];
 if (p.has('system_number')) { const n=phone(p.get('system_number')); const allowed=admin?await env.DB.prepare('SELECT number FROM system_numbers WHERE number=? AND active=1').bind(n).first():await env.DB.prepare('SELECT u.system_number FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND s.active=1').bind(user.email,n).first(); if (!allowed) throw new HttpError(403,'System number is not assigned'); conditions.push('m.system_number=?');bindings.push(n); }
 if (p.has('peer_number')) { conditions.push('m.peer_number=?');bindings.push(phone(p.get('peer_number'))); }
 const query=p.get('q'); if (query) { if(query.length>200) throw new HttpError(400,'Search too long'); conditions.push('(instr(lower(m.body),lower(?))>0 OR instr(m.peer_number,?)>0)');bindings.push(query,query); }
 for(const [param,op] of [['from','>='],['to','<']] as const) if(p.has(param)) { const raw=p.get(param)!; if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))) throw new HttpError(400,'Invalid date filter'); conditions.push('m.occurred_at '+op+' ?');bindings.push(Number(raw)); }
 const direction=choice(p,'direction',['in','out']); if (direction) { conditions.push('m.direction=?');bindings.push(direction); }
 const status=choice(p,'status',['pending','accepted','rejected','unknown']); if (status) { conditions.push('m.submission_status=?');bindings.push(status); }
 return {conditions,bindings};
}
export async function data(url: URL, env: Env, user: User): Promise<Response> {
 const p=url.searchParams;
 if (url.pathname === '/api/stats') { const {conditions,bindings}=await filters(p,env,user); return json(await env.DB.prepare(`SELECT COUNT(*) AS total,COALESCE(SUM(m.direction='in'),0) AS incoming,COALESCE(SUM(m.direction='out'),0) AS outgoing,COUNT(DISTINCT m.peer_number) AS peers,COALESCE(MAX(m.id),0) AS max_id FROM messages m WHERE ${conditions.join(' AND ')}`).bind(...bindings).first()); }
 if (url.pathname !== '/api/messages') throw new HttpError(404,'Not found');
 const {conditions,bindings}=await filters(p,env,user);
 const sort=choice(p,'sort',Object.keys(sorts) as (keyof typeof sorts)[]) ?? 'time'; const order=choice(p,'order',['asc','desc']) ?? 'desc';
 const limit=Number(p.get('limit') || 50); if(!Number.isInteger(limit)||limit<1||limit>100) throw new HttpError(400,'limit must be 1–100');
 const updates=p.has('since'); if(updates && p.has('cursor')) throw new HttpError(400,'Use cursor or since, not both');
 const cursor=updates?decodeCursor(p.get('since')):decodeCursor(p.get('cursor'),sort!=='time'); if(updates&&!cursor) throw new HttpError(400,'since requires a cursor');
 const expr=updates?'m.updated_at':sorts[sort]; const dir=updates||order==='asc'?'ASC':'DESC'; const op=dir==='ASC'?'>':'<';
 if(cursor) {conditions.push(`(${expr} ${op} ? OR (${expr}=? AND m.id ${op} ?))`);bindings.push(cursor.t,cursor.t,cursor.id);}
 const syncStart=Date.now()-1;
 const result=await env.DB.prepare(`SELECT ${columns},${expr} AS sort_key FROM messages m WHERE ${conditions.join(' AND ')} ORDER BY ${expr} ${dir},m.id ${dir} LIMIT ?`).bind(...bindings,limit+1).all<Row>();
 const more=result.results.length>limit; const page=result.results.slice(0,limit); const last=page.at(-1);
 const next=last?encodeCursor({t:last.sort_key,id:last.id}):null;
 return json({messages:page.map(({sort_key,...m})=>m),has_more:more,next_cursor:more?next:null,sync_cursor:updates?(next||p.get('since')):encodeCursor({t:syncStart,id:0})});
}

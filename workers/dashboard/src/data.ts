import {Env,HttpError,json,phone,encodeCursor,decodeCursor} from '../../../shared/validation';
type Row = {id:number;occurred_at:number;updated_at:number;[key:string]:unknown};
export async function data(url: URL, env: Env, email: string): Promise<Response> {
 if (url.pathname === '/api/numbers') { const result = await env.DB.prepare('SELECT s.number,s.label FROM system_numbers s JOIN user_numbers u ON u.system_number=s.number WHERE u.email=? AND s.active=1 ORDER BY s.label,s.number').bind(email).all(); return json({numbers:result.results}); }
 if (url.pathname !== '/api/messages') throw new HttpError(404,'Not found');
 const p=url.searchParams; const conditions=[`EXISTS (SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=m.system_number AND s.active=1)`]; const bindings: (string|number)[]=[email];
 if (p.has('system_number')) { const n=phone(p.get('system_number')); const allowed=await env.DB.prepare('SELECT u.system_number FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND s.active=1').bind(email,n).first(); if (!allowed) throw new HttpError(403,'System number is not assigned'); conditions.push('m.system_number=?');bindings.push(n); }
 if (p.has('peer_number')) { conditions.push('m.peer_number=?');bindings.push(phone(p.get('peer_number'))); }
 const query=p.get('q'); if (query) { if(query.length>200) throw new HttpError(400,'Search too long'); conditions.push('(instr(lower(m.body),lower(?))>0 OR instr(m.peer_number,?)>0)');bindings.push(query,query); }
 for(const [param,op] of [['from','>='],['to','<']] as const) if(p.has(param)) { const raw=p.get(param)!; if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))) throw new HttpError(400,'Invalid date filter'); conditions.push('m.occurred_at '+op+' ?');bindings.push(Number(raw)); }
 const limit=Number(p.get('limit') || 50); if(!Number.isInteger(limit)||limit<1||limit>100) throw new HttpError(400,'limit must be 1–100');
 const updates=p.has('since'); if(updates && p.has('cursor')) throw new HttpError(400,'Use cursor or since, not both');
 const cursor=decodeCursor(p.get(updates?'since':'cursor')); if(updates&&!cursor) throw new HttpError(400,'since requires a cursor');
 const column=updates?'updated_at':'occurred_at'; const op=updates?'>':'<'; if(cursor) {conditions.push(`(m.${column} ${op} ? OR (m.${column}=? AND m.id ${op} ?))`);bindings.push(cursor.t,cursor.t,cursor.id);}
 const syncStart=Date.now()-1; const order=updates?'ASC':'DESC';
 const result=await env.DB.prepare(`SELECT m.id,m.direction,m.system_number,m.peer_number,m.body,m.occurred_at,m.received_at,m.time_source,m.submission_status,m.provider_message_id,m.updated_at FROM messages m WHERE ${conditions.join(' AND ')} ORDER BY m.${column} ${order},m.id ${order} LIMIT ?`).bind(...bindings,limit+1).all<Row>();
 const more=result.results.length>limit; const messages=result.results.slice(0,limit); const last=messages.at(-1);
 const next=last?encodeCursor({t:last[column],id:last.id}):null;
 return json({messages,has_more:more,next_cursor:more?next:null,sync_cursor:updates?(next||p.get('since')):encodeCursor({t:syncStart,id:0})});
}

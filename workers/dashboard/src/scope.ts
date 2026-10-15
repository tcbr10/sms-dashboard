import {Env,HttpError,phone} from '../../../shared/validation';
import {ContactField} from '../../../shared/settings';
import {User} from './users';
// Which messages a user may see. Admins see every active number. A user sees the numbers assigned to them; an
// assignment can be restricted to messages from a date onward and to messages matching every one of its rules.
// The SQL refers to messages as m and to the customer's contacts row as c, so callers must join contacts as c.
export type Rule = {type:'field';field:string;op:'eq'|'contains';value:string}|{type:'answer';op:'eq'|'contains';value:string}|{type:'text';value:string}|{type:'direction';value:'in'|'out'};
export type Scope = {sql:string;bindings:(string|number)[]};
const MAX_RULES = 10;
export function validateRules(value: unknown, fields: ContactField[]): Rule[]|null {
 if (value === undefined || value === null) return null; if (!Array.isArray(value) || value.length > MAX_RULES) throw new HttpError(400,'Up to '+MAX_RULES+' view conditions');
 const rules = value.map((raw): Rule => { const r = raw as Record<string,unknown>; const v = typeof r.value === 'string' ? r.value.trim() : '';
  if (r.type === 'direction') { if (r.value !== 'in' && r.value !== 'out') throw new HttpError(400,'Invalid direction condition'); return {type:'direction',value:r.value}; }
  if (!v || v.length > 200) throw new HttpError(400,'Every view condition needs a value of up to 200 characters');
  if (r.type === 'text') return {type:'text',value:v};
  const op = r.op === 'contains' ? 'contains' : r.op === 'eq' ? 'eq' : (() => { throw new HttpError(400,'Invalid condition operator'); })();
  if (r.type === 'answer') return {type:'answer',op,value:v};
  if (r.type === 'field') { if (typeof r.field !== 'string' || !fields.some(f => f.id === r.field)) throw new HttpError(400,'Unknown contact field in a view condition'); return {type:'field',field:r.field,op,value:v}; }
  throw new HttpError(400,'Invalid view condition');
 });
 return rules.length ? rules : null;
}
function match(expr: string, op: 'eq'|'contains'): string { return op === 'eq' ? `lower(${expr})=lower(?)` : `instr(lower(${expr}),lower(?))>0`; }
// Field IDs are validated against the settings, which allow only lowercase letters, digits and underscores.
function ruleSql(r: Rule): Scope {
 switch (r.type) {
  case 'field': return {sql:match(`COALESCE(json_extract(c.data,'$.${r.field}'),'')`,r.op),bindings:[r.value]};
  case 'answer': return {sql:`EXISTS (SELECT 1 FROM bot_answers a WHERE a.system_number=m.system_number AND a.peer_number=m.peer_number AND ${match('COALESCE(a.meaning,a.answer)',r.op)})`,bindings:[r.value]};
  case 'text': return {sql:'instr(lower(m.body),lower(?))>0',bindings:[r.value]};
  case 'direction': return {sql:'m.direction=?',bindings:[r.value]};
 }
}
type Assignment = {system_number:string;view_from:number|null;view_rules:string|null};
// The leading + keeps SQLite from choosing the per-number index for these conditions (see data.ts).
export async function scope(env: Env, user: User): Promise<Scope> {
 if (user.role === 'admin') return {sql:'+m.system_number IN (SELECT sn.number FROM system_numbers sn WHERE sn.active=1)',bindings:[]};
 const rows = (await env.DB.prepare('SELECT u.system_number,u.view_from,u.view_rules FROM user_numbers u JOIN system_numbers sn ON sn.number=u.system_number WHERE u.email=? AND sn.active=1').bind(user.email).all<Assignment>()).results;
 if (!rows.length) return {sql:'0',bindings:[]};
 const open = rows.filter(r => r.view_from === null && !r.view_rules).map(r => r.system_number); const parts: string[] = []; const bindings: (string|number)[] = [];
 if (open.length) { parts.push('+m.system_number IN (SELECT value FROM json_each(?))'); bindings.push(JSON.stringify(open)); }
 for (const r of rows) { if (r.view_from === null && !r.view_rules) continue;
  const conds = ['+m.system_number=?']; bindings.push(r.system_number);
  if (r.view_from !== null) { conds.push('m.occurred_at>=?'); bindings.push(r.view_from); }
  let rules: Rule[] = []; try { rules = r.view_rules ? JSON.parse(r.view_rules) as Rule[] : []; } catch { conds.push('0'); }
  for (const rule of rules) { const q = ruleSql(rule); conds.push(q.sql); bindings.push(...q.bindings); }
  parts.push('('+conds.join(' AND ')+')'); }
 return {sql:parts.length === 1 ? parts[0] : '('+parts.join(' OR ')+')',bindings};
}
// Whether the user can see at least one message of this customer on this number.
export async function seesCustomer(env: Env, user: User, system: string, peer: string): Promise<boolean> {
 const s = await scope(env,user);
 return !!await env.DB.prepare(`SELECT 1 FROM messages m LEFT JOIN contacts c ON c.number=m.peer_number WHERE m.system_number=? AND m.peer_number=? AND ${s.sql} LIMIT 1`).bind(phone(system),phone(peer),...s.bindings).first();
}
export async function seesMessage(env: Env, user: User, id: number): Promise<boolean> {
 const s = await scope(env,user);
 return !!await env.DB.prepare(`SELECT 1 FROM messages m LEFT JOIN contacts c ON c.number=m.peer_number WHERE m.id=? AND ${s.sql}`).bind(id,...s.bindings).first();
}

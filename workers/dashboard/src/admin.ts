import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {ContactField,loadSettings,validateSettings} from '../../../shared/settings';
import {User,audit} from './users';
const DAY = 86400000;
function email(value: unknown): string { const e = text(value,'email',254).trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new HttpError(400,'Invalid email'); return e; }
function name(value: unknown): string { if (value === undefined) return ''; if (typeof value !== 'string' || value.trim().length > 80) throw new HttpError(400,'Name must be at most 80 characters'); return value.trim(); }
function dailyLimit(value: unknown): number|null { if (value === null || value === undefined) return null; if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100000) throw new HttpError(400,'Daily limit must be empty or a whole number from 0 to 100000'); return value as number; }
function flag(value: unknown, name: string): number { if (typeof value !== 'boolean') throw new HttpError(400,name+' must be true or false'); return value ? 1 : 0; }
function testNumber(value: unknown): string|null { return value === null || value === undefined || value === '' ? null : recipient(value); }
// Contact data keeps only known fields, as trimmed text of up to 200 characters; empty values are dropped.
function contactData(value: unknown, fields: ContactField[]): Record<string,string> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400,'Invalid contact data');
 const out: Record<string,string> = {}; for (const f of fields) { const v = (value as Record<string,unknown>)[f.id]; if (v === undefined || v === null) continue; if (typeof v !== 'string' && typeof v !== 'number') throw new HttpError(400,'Invalid value for '+f.label); const t = String(v).trim(); if (t.length > 200) throw new HttpError(400,f.label+' is too long'); if (t) out[f.id] = t; }
 return out;
}
async function activeAdmins(env: Env): Promise<number> { return (await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").first<{n:number}>())?.n ?? 0; }
export async function admin(request: Request, url: URL, env: Env, user: User): Promise<Response> {
 if (user.role !== 'admin') throw new HttpError(403,'Admins only');
 const path = url.pathname.slice('/api/admin/'.length);
 if (request.method === 'GET') {
  if (path === 'users') { const r = await env.DB.prepare("SELECT u.email,u.name,u.role,u.active,u.can_bulk_send,u.can_edit_contacts,u.daily_limit,u.created_at,u.last_seen_at,u.test_number,u.sessions_revoked_at,(SELECT json_group_array(json_object('number',n.system_number,'can_send',n.can_send)) FROM user_numbers n WHERE n.email=u.email) AS numbers,(SELECT COALESCE(SUM(s.recipients),0) FROM sends s WHERE s.email=u.email AND s.created_at>? AND s.status!='rejected') AS sent_24h FROM users u ORDER BY u.role,u.name,u.email").bind(Date.now()-DAY).all<Record<string,unknown>>(); return json({users:r.results.map(u => ({...u,numbers:JSON.parse(String(u.numbers))}))}); }
  if (path === 'numbers') return json({numbers:(await env.DB.prepare('SELECT s.number,s.label,s.active,(SELECT COUNT(*) FROM user_numbers u WHERE u.system_number=s.number) AS users FROM system_numbers s ORDER BY s.active DESC,s.label,s.number').all()).results});
  if (path === 'settings') return json(await loadSettings(env.DB));
  if (path === 'contacts') { const q = (url.searchParams.get('q') || '').slice(0,100); const needle = q.replace(/^0/,''); const where = q ? 'WHERE instr(number,?)>0 OR EXISTS (SELECT 1 FROM json_each(data) j WHERE instr(lower(j.value),lower(?))>0)' : '';
   const [rows,count] = await Promise.all([env.DB.prepare('SELECT number,data,updated_at,updated_by FROM contacts '+where+' ORDER BY updated_at DESC,number LIMIT 300').bind(...(q?[needle,q]:[])).all<{data:string}>(),env.DB.prepare('SELECT COUNT(*) AS n FROM contacts').first<{n:number}>()]);
   return json({contacts:rows.results.map(r => ({...r,data:JSON.parse(r.data)})),total:count?.n ?? 0}); }
  if (path === 'optouts') return json({optouts:(await env.DB.prepare('SELECT number,source,created_at,created_by FROM opt_outs ORDER BY created_at DESC LIMIT 5000').all()).results});
  if (path === 'audit') { const before = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER); if (!Number.isSafeInteger(before)) throw new HttpError(400,'Invalid cursor'); const r = await env.DB.prepare('SELECT id,at,email,action,target,details FROM audit_log WHERE id<? ORDER BY id DESC LIMIT 101').bind(before).all<{id:number}>(); return json({entries:r.results.slice(0,100),more:r.results.length>100}); }
  throw new HttpError(404,'Not found');
 }
 const body = await readBody(request, 65536);
 if (path === 'users/save') {
  const target = email(body.email); const create = body.create === true; const role = body.role; if (role !== 'admin' && role !== 'user') throw new HttpError(400,'Invalid role');
  const label = name(body.name); const active = flag(body.active,'active'); const bulk = flag(body.can_bulk_send,'can_bulk_send'); const contacts = body.can_edit_contacts === undefined ? 1 : flag(body.can_edit_contacts,'can_edit_contacts'); const limit = dailyLimit(body.daily_limit); const test = testNumber(body.test_number);
  if (!Array.isArray(body.numbers)) throw new HttpError(400,'numbers must be a list');
  const numbers = new Map<string,number>(); for (const n of body.numbers) { if (!n || typeof n !== 'object') throw new HttpError(400,'Invalid number permission'); const v = n as Record<string,unknown>; numbers.set(phone(v.number),flag(v.can_send,'can_send')); }
  if (numbers.size) { const known = (await env.DB.prepare('SELECT COUNT(*) AS n FROM system_numbers WHERE number IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...numbers.keys()])).first<{n:number}>())?.n; if (known !== numbers.size) throw new HttpError(400,'Unknown system number'); }
  const existing = await env.DB.prepare('SELECT role,active FROM users WHERE email=?').bind(target).first<{role:string;active:number}>();
  if (create && existing) throw new HttpError(409,'A user with this email already exists'); if (!create && !existing) throw new HttpError(404,'User not found');
  if (target === user.email && (role !== 'admin' || !active)) throw new HttpError(400,'You cannot remove your own admin rights or disable yourself');
  if (existing?.role === 'admin' && existing.active && (role !== 'admin' || !active) && await activeAdmins(env) <= 1) throw new HttpError(400,'At least one active admin is required');
  const assignments = [...numbers].map(([number,can_send]) => ({number,can_send}));
  await env.DB.batch([
   env.DB.prepare('INSERT INTO users (email,name,role,active,can_bulk_send,can_edit_contacts,daily_limit,test_number,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,active=excluded.active,can_bulk_send=excluded.can_bulk_send,can_edit_contacts=excluded.can_edit_contacts,daily_limit=excluded.daily_limit,test_number=excluded.test_number').bind(target,label,role,active,bulk,contacts,limit,test,Date.now()),
   env.DB.prepare('DELETE FROM user_numbers WHERE email=?').bind(target),
   env.DB.prepare("INSERT INTO user_numbers (email,system_number,can_send) SELECT ?,json_extract(value,'$.number'),json_extract(value,'$.can_send') FROM json_each(?)").bind(target,JSON.stringify(assignments)),
   audit(env,user.email,create ? 'user.create' : 'user.update',target,{name:label,role,active:!!active,can_bulk_send:!!bulk,can_edit_contacts:!!contacts,daily_limit:limit,numbers:assignments}),
  ]);
  return json({ok:true});
 }
 if (path === 'users/delete') {
  const target = email(body.email); if (target === user.email) throw new HttpError(400,'You cannot delete yourself');
  const existing = await env.DB.prepare('SELECT role,active FROM users WHERE email=?').bind(target).first<{role:string;active:number}>(); if (!existing) throw new HttpError(404,'User not found');
  if (existing.role === 'admin' && existing.active && await activeAdmins(env) <= 1) throw new HttpError(400,'At least one active admin is required');
  await env.DB.batch([env.DB.prepare('DELETE FROM user_numbers WHERE email=?').bind(target),env.DB.prepare('DELETE FROM users WHERE email=?').bind(target),audit(env,user.email,'user.delete',target)]);
  return json({ok:true});
 }
 // Ends the user's current sign-in: Access logins issued before now are refused, so they must sign in again.
 if (path === 'users/disconnect') {
  const target = email(body.email); if (target === user.email) throw new HttpError(400,'You cannot disconnect yourself'); const disable = body.disable === true;
  const existing = await env.DB.prepare('SELECT role,active FROM users WHERE email=?').bind(target).first<{role:string;active:number}>(); if (!existing) throw new HttpError(404,'User not found');
  if (disable && existing.role === 'admin' && existing.active && await activeAdmins(env) <= 1) throw new HttpError(400,'At least one active admin is required');
  await env.DB.batch([env.DB.prepare('UPDATE users SET sessions_revoked_at=?'+(disable?',active=0':'')+' WHERE email=?').bind(Date.now(),target),audit(env,user.email,'user.disconnect',target,{disable})]);
  return json({ok:true});
 }
 if (path === 'contacts/save') {
  const fields = (await loadSettings(env.DB)).contact_fields; const number = recipient(body.number); const data = contactData(body.data,fields);
  await env.DB.batch([env.DB.prepare('INSERT INTO contacts (number,data,updated_at,updated_by) VALUES (?,?,?,?) ON CONFLICT(number) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(number,JSON.stringify(data),Date.now(),user.email),audit(env,user.email,'contact.save',number)]);
  return json({ok:true,number});
 }
 if (path === 'contacts/delete') { const number = phone(body.number); await env.DB.batch([env.DB.prepare('DELETE FROM contacts WHERE number=?').bind(number),audit(env,user.email,'contact.delete',number)]); return json({ok:true}); }
 // Imports up to 1000 contacts per request. 'update' merges the given fields into existing contacts; 'skip' leaves existing contacts alone.
 if (path === 'contacts/import') {
  const fields = (await loadSettings(env.DB)).contact_fields; if (body.mode !== 'update' && body.mode !== 'skip') throw new HttpError(400,'Invalid import mode');
  if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 1000) throw new HttpError(400,'Send between 1 and 1000 rows');
  const rows = new Map<string,Record<string,string>>(); let invalid = 0;
  for (const r of body.rows) { try { const v = r as Record<string,unknown>; const number = recipient(v.number); rows.set(number,{...rows.get(number),...contactData(v.data,fields)}); } catch { invalid++; } }
  const payload = JSON.stringify([...rows].map(([number,data]) => ({number,data})));
  const results = !rows.size ? [] : await env.DB.batch([env.DB.prepare("INSERT INTO contacts (number,data,updated_at,updated_by) SELECT json_extract(value,'$.number'),json_extract(value,'$.data'),?,? FROM json_each(?) WHERE true ON CONFLICT(number) DO "+(body.mode === 'update' ? 'UPDATE SET data=json_patch(contacts.data,excluded.data),updated_at=excluded.updated_at,updated_by=excluded.updated_by' : 'NOTHING')).bind(Date.now(),user.email,payload),audit(env,user.email,'contacts.import',null,{rows:rows.size,mode:body.mode})]);
  // Changed rows: new contacts, plus updated ones in 'update' mode.
  return json({imported:results[0]?.meta.changes ?? 0,invalid});
 }
 if (path === 'numbers/save') {
  const number = phone(body.number); const label = text(typeof body.label === 'string' ? body.label.trim() : body.label,'label',40); const active = flag(body.active,'active');
  const exists = await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=?').bind(number).first();
  if (body.create === true && exists) throw new HttpError(409,'This number already exists'); if (body.create !== true && !exists) throw new HttpError(404,'Number not found');
  await env.DB.batch([env.DB.prepare('INSERT INTO system_numbers (number,label,active) VALUES (?,?,?) ON CONFLICT(number) DO UPDATE SET label=excluded.label,active=excluded.active').bind(number,label,active),audit(env,user.email,body.create === true ? 'number.create' : 'number.update',number,{label,active:!!active})]);
  return json({ok:true});
 }
 if (path === 'settings') {
  const current = await loadSettings(env.DB); const next = validateSettings({...current,...body});
  const changed = (Object.keys(next) as (keyof typeof next)[]).filter(k => JSON.stringify(next[k]) !== JSON.stringify(current[k]));
  if (changed.length) await env.DB.batch([...changed.map(k => env.DB.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,JSON.stringify(next[k]))),audit(env,user.email,'settings.update',null,Object.fromEntries(changed.map(k => [k,next[k]])))]);
  return json(next);
 }
 if (path === 'optouts/add') {
  if (!Array.isArray(body.numbers) || !body.numbers.length || body.numbers.length > 1000) throw new HttpError(400,'Add between 1 and 1000 numbers');
  const valid = new Set<string>(); let invalid = 0; for (const n of body.numbers) { try { valid.add(recipient(n)); } catch { invalid++; } }
  if (valid.size) await env.DB.batch([env.DB.prepare("INSERT INTO opt_outs (number,source,created_at,created_by) SELECT value,'manual',?,? FROM json_each(?) WHERE true ON CONFLICT(number) DO NOTHING").bind(Date.now(),user.email,JSON.stringify([...valid])),audit(env,user.email,'optout.add',null,{count:valid.size})]);
  return json({added:valid.size,invalid});
 }
 if (path === 'optouts/remove') {
  const number = phone(body.number); await env.DB.batch([env.DB.prepare('DELETE FROM opt_outs WHERE number=?').bind(number),audit(env,user.email,'optout.remove',number)]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

import {Env,HttpError,json,readBody} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
export type User = {email:string;name:string;role:'admin'|'user';can_bulk_send:number;daily_limit:number|null;density:string|null};
export type Access = {number:string;label:string;can_send:number};
const DAY = 86400000;
// Only active users get in; Cloudflare Access proves the email, this table decides whether it may use the dashboard.
export async function loadUser(env: Env, email: string): Promise<User|null> { return env.DB.prepare('SELECT email,name,role,can_bulk_send,daily_limit,density FROM users WHERE email=? AND active=1').bind(email).first<User>(); }
// Admins see and may send from every active number; users only from their assignments.
export async function numbersFor(env: Env, user: User): Promise<Access[]> {
 const result = user.role === 'admin' ? await env.DB.prepare('SELECT number,label,1 AS can_send FROM system_numbers WHERE active=1 ORDER BY label,number').all<Access>() : await env.DB.prepare('SELECT s.number,s.label,u.can_send FROM system_numbers s JOIN user_numbers u ON u.system_number=s.number WHERE u.email=? AND s.active=1 ORDER BY s.label,s.number').bind(user.email).all<Access>();
 return result.results;
}
export async function sentLast24h(env: Env, email: string): Promise<number> { const r = await env.DB.prepare("SELECT COALESCE(SUM(recipients),0) AS n FROM sends WHERE email=? AND created_at>? AND status!='rejected'").bind(email, Date.now()-DAY).first<{n:number}>(); return r?.n ?? 0; }
export function audit(env: Env, email: string, action: string, target: string|null, details?: unknown): D1PreparedStatement { return env.DB.prepare('INSERT INTO audit_log (at,email,action,target,details) VALUES (?,?,?,?,?)').bind(Date.now(), email, action, target, details === undefined ? null : JSON.stringify(details)); }
export async function me(env: Env, user: User): Promise<Response> {
 const now = Date.now(); const [settings, numbers, sent] = await Promise.all([loadSettings(env.DB), numbersFor(env, user), sentLast24h(env, user.email), env.DB.prepare('UPDATE users SET last_seen_at=? WHERE email=? AND (last_seen_at IS NULL OR last_seen_at<?)').bind(now, user.email, now-300000).run()]);
 const admin = user.role === 'admin';
 return json({email:user.email,name:user.name,role:user.role,density:user.density ?? settings.default_density,numbers,can_bulk_send:admin || !!user.can_bulk_send,daily_limit:admin ? null : user.daily_limit ?? settings.default_daily_limit,sent_24h:sent,settings:{org_name:settings.org_name,refresh_seconds:settings.refresh_seconds,max_recipients:settings.max_recipients,optout_text:settings.optout_text,allow_international:settings.allow_international}});
}
export async function prefs(request: Request, env: Env, user: User): Promise<Response> {
 const body = await readBody(request); const density = body.density; if (density !== 'wide' && density !== 'narrow' && density !== 'dense') throw new HttpError(400,'Invalid density');
 await env.DB.prepare('UPDATE users SET density=? WHERE email=?').bind(density, user.email).run(); return json({ok:true});
}

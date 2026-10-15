import {Env} from './validation';
// Audit entries and send usage, shared by the dashboard and by scheduled sends run from the ingest Worker.
const DAY = 86400000;
export function audit(env: Env, email: string, action: string, target: string|null, details?: unknown): D1PreparedStatement { return env.DB.prepare('INSERT INTO audit_log (at,email,action,target,details) VALUES (?,?,?,?,?)').bind(Date.now(), email, action, target, details === undefined ? null : JSON.stringify(details)); }
export async function sentLast24h(env: Env, email: string): Promise<number> { const r = await env.DB.prepare("SELECT COALESCE(SUM(recipients),0) AS n FROM sends WHERE email=? AND created_at>? AND status!='rejected'").bind(email, Date.now()-DAY).first<{n:number}>(); return r?.n ?? 0; }

import {Env} from '../../../shared/validation';
import {audit} from './users';
import {Fetcher} from './send';
// Keeps the email entries of one Cloudflare Access policy equal to the dashboard's active users, so people added on the
// admin page can sign in and disabled or deleted ones can't reach the login. Other include rules in the policy are kept.
// The whole list is written every time, so a missed sync is repaired by the next one.
export type AccessSync = {ok:true;at:number;emails:number}|{ok:false;at:number;error:string};
const API = 'https://api.cloudflare.com/client/v4/accounts/';
// Fields the API returns but does not accept back.
const READ_ONLY = ['id','uid','created_at','updated_at','app_count','reusable','app_id'];
type Policy = Record<string,unknown> & {include?:Record<string,unknown>[]};
export function accessConfigured(env: Env): boolean { return !!(env.CF_API_TOKEN && env.ACCESS_ACCOUNT_ID && env.ACCESS_POLICY_ID); }
async function call(fetcher: Fetcher, env: Env, path: string, init: RequestInit = {}): Promise<{status:number;body:{success?:boolean;result?:unknown;errors?:{message?:string}[]}}> {
 const r = await fetcher(API+env.ACCESS_ACCOUNT_ID+path, {...init,headers:{Authorization:'Bearer '+env.CF_API_TOKEN,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000)});
 let body: {success?:boolean;result?:unknown;errors?:{message?:string}[]} = {}; try { body = await r.json(); } catch { /* reported by status below */ }
 return {status:r.status,body};
}
// Reusable policies live at /access/policies/{id}; a policy created inside an application lives under that application,
// which is found by the dashboard's Access AUD.
async function locate(fetcher: Fetcher, env: Env): Promise<{path:string;policy:Policy}> {
 const direct = await call(fetcher,env,'/access/policies/'+env.ACCESS_POLICY_ID);
 if (direct.status === 200 && direct.body.success) return {path:'/access/policies/'+env.ACCESS_POLICY_ID,policy:direct.body.result as Policy};
 if (direct.status !== 404) throw new Error(direct.body.errors?.[0]?.message || 'Cloudflare answered '+direct.status);
 const apps = await call(fetcher,env,'/access/apps?per_page=1000');
 const app = (apps.body.result as {id:string;aud:string}[]|undefined)?.find(a => a.aud === env.ACCESS_AUD);
 if (!app) throw new Error(apps.body.errors?.[0]?.message || 'Access policy not found');
 const path = '/access/apps/'+app.id+'/policies/'+env.ACCESS_POLICY_ID; const r = await call(fetcher,env,path);
 if (r.status !== 200 || !r.body.success) throw new Error(r.body.errors?.[0]?.message || 'Access policy not found');
 return {path,policy:r.body.result as Policy};
}
export async function syncAccess(env: Env, fetcher: Fetcher, by: string): Promise<AccessSync|null> {
 if (!accessConfigured(env)) return null;
 const at = Date.now(); let result: AccessSync;
 try {
  const emails = (await env.DB.prepare('SELECT email FROM users WHERE active=1 ORDER BY email').all<{email:string}>()).results.map(u => u.email);
  if (!emails.length) throw new Error('No active users');
  const {path,policy} = await locate(fetcher,env);
  const body: Policy = {}; for (const [k,v] of Object.entries(policy)) if (!READ_ONLY.includes(k)) body[k] = v;
  body.include = (policy.include || []).filter(rule => !('email' in rule)).concat(emails.map(email => ({email:{email}})));
  const r = await call(fetcher,env,path,{method:'PUT',body:JSON.stringify(body)});
  if (r.status !== 200 || !r.body.success) throw new Error(r.body.errors?.[0]?.message || 'Cloudflare answered '+r.status);
  result = {ok:true,at,emails:emails.length};
 } catch (error) { result = {ok:false,at,error:error instanceof Error ? error.message.slice(0,300) : 'Sync failed'}; }
 await env.DB.batch([env.DB.prepare("INSERT INTO settings (key,value) VALUES ('access_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(result)),audit(env,by,'access.sync',null,result)]);
 return result;
}
export async function lastSync(env: Env): Promise<AccessSync|null> { const r = await env.DB.prepare("SELECT value FROM settings WHERE key='access_sync'").first<{value:string}>(); try { return r ? JSON.parse(r.value) : null; } catch { return null; } }

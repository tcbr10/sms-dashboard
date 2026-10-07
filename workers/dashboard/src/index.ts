import {Env,HttpError,failure} from '../../../shared/validation';
import {Identity,identity} from './auth';
import {data} from './data';
import {page,adminPage,noAccessPage,sessionEndedPage} from './page';
import {loadUser,logout,me,prefs,touch} from './users';
import {saveContact} from './contacts';
import {admin} from './admin';
import {lists} from './lists';
import {send,Fetcher} from './send';
export type Options = {fetcher?:Fetcher;waitUntil?:(promise:Promise<unknown>)=>void};
function html(body:string,nonce:string,status=200):Response { return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}}); }
// Writes must come from this dashboard's own pages: same Origin and a JSON body, which other sites cannot send without CORS.
function sameOrigin(request:Request):void { if (request.headers.get('Origin')!==new URL(request.url).origin) throw new HttpError(403,'Cross-site request blocked'); if (!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json')) throw new HttpError(415,'JSON required'); }
// Everything after Cloudflare Access identified the email. Exported so tests and the local preview can call it directly;
// a plain email (no login time) skips the ended-session check.
export async function handle(request:Request,env:Env,who:string|Identity,options:Options={}):Promise<Response> {
 const url=new URL(request.url); const nonce=crypto.randomUUID().replace(/-/g,''); const email=typeof who==='string'?who:who.email;
 const user=await loadUser(env,email);
 if (!user) { if (url.pathname.startsWith('/api/')) throw new HttpError(403,'This account has no access'); return html(noAccessPage(nonce,email),nonce,403); }
 if (typeof who!=='string' && user.sessions_revoked_at && who.iat*1000<user.sessions_revoked_at) { if (url.pathname.startsWith('/api/')) throw new HttpError(401,'Session ended'); return html(sessionEndedPage(nonce),nonce,401); }
 const seen=touch(env,email).catch(()=>undefined); if (options.waitUntil) options.waitUntil(seen); else await seen;
 if (request.method==='POST') { sameOrigin(request);
  if (url.pathname==='/api/send') return send(request,env,user,options.fetcher??((input,init)=>fetch(input,init)));
  if (url.pathname==='/api/me/prefs') return prefs(request,env,user);
  if (url.pathname==='/api/me/logout') return logout(env,user);
  if (url.pathname==='/api/contacts/save') return saveContact(request,env,user);
  if (url.pathname.startsWith('/api/lists/')) return lists(request,url,env,user);
  if (url.pathname.startsWith('/api/admin/')) return admin(request,url,env,user);
  throw new HttpError(404,'Not found'); }
 if (request.method!=='GET') throw new HttpError(405,'GET or POST required');
 if (url.pathname==='/api/me') return me(env,user);
 if (url.pathname==='/api/lists'||url.pathname.startsWith('/api/lists/')) return lists(request,url,env,user);
 if (url.pathname.startsWith('/api/admin/')) return admin(request,url,env,user);
 if (url.pathname.startsWith('/api/')) return data(url,env,user);
 if (url.pathname==='/') return html(page(nonce),nonce);
 if (url.pathname==='/admin') return user.role==='admin'?html(adminPage(nonce),nonce):Response.redirect(new URL('/',url).toString(),302);
 throw new HttpError(404,'Not found');
}
export default {async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response> { try { return await handle(request,env,await identity(request,env),{waitUntil:p=>ctx.waitUntil(p)}); } catch(error) { return failure(error); } }};

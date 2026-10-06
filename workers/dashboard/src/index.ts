import {Env,HttpError,failure} from '../../../shared/validation';
import {identity} from './auth';
import {data} from './data';
import {page,adminPage,noAccessPage} from './page';
import {loadUser,me,prefs} from './users';
import {admin} from './admin';
import {send,Fetcher} from './send';
function html(body:string,nonce:string,status=200):Response { return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}}); }
// Writes must come from this dashboard's own pages: same Origin and a JSON body, which other sites cannot send without CORS.
function sameOrigin(request:Request):void { if (request.headers.get('Origin')!==new URL(request.url).origin) throw new HttpError(403,'Cross-site request blocked'); if (!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json')) throw new HttpError(415,'JSON required'); }
// Everything after Cloudflare Access identified the email. Exported so tests and the local preview can call it directly.
export async function handle(request:Request,env:Env,email:string,fetcher:Fetcher=(input,init)=>fetch(input,init)):Promise<Response> {
 const url=new URL(request.url); const nonce=crypto.randomUUID().replace(/-/g,'');
 const user=await loadUser(env,email);
 if (!user) { if (url.pathname.startsWith('/api/')) throw new HttpError(403,'This account has no access'); return html(noAccessPage(nonce,email),nonce,403); }
 if (request.method==='POST') { sameOrigin(request);
  if (url.pathname==='/api/send') return send(request,env,user,fetcher);
  if (url.pathname==='/api/me/prefs') return prefs(request,env,user);
  if (url.pathname.startsWith('/api/admin/')) return admin(request,url,env,user);
  throw new HttpError(404,'Not found'); }
 if (request.method!=='GET') throw new HttpError(405,'GET or POST required');
 if (url.pathname==='/api/me') return me(env,user);
 if (url.pathname.startsWith('/api/admin/')) return admin(request,url,env,user);
 if (url.pathname.startsWith('/api/')) return data(url,env,user);
 if (url.pathname==='/') return html(page(nonce),nonce);
 if (url.pathname==='/admin') return user.role==='admin'?html(adminPage(nonce),nonce):Response.redirect(new URL('/',url).toString(),302);
 throw new HttpError(404,'Not found');
}
export default {async fetch(request:Request,env:Env):Promise<Response> { try { return await handle(request,env,await identity(request,env)); } catch(error) { return failure(error); } }};

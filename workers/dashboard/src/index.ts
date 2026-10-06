import {Env,HttpError,failure} from '../../../shared/validation';
import {identity} from './auth';
import {data} from './data';
import {page} from './page';
export default {async fetch(request:Request,env:Env):Promise<Response> {
 try { const email=await identity(request,env); if(request.method!=='GET') throw new HttpError(405,'GET required'); const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')) return await data(url,env,email); if(url.pathname!=='/') throw new HttpError(404,'Not found');
 const nonce=crypto.randomUUID().replace(/-/g,''); return new Response(page(nonce),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}});
 } catch(error) {return failure(error);} }};

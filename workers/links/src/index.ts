import {Env} from '../../../shared/validation';
import {CODE_LENGTH,Link,classify,recordClick} from '../../../shared/links';
// Links Worker: the public short-link address. GET /<code> redirects to the link's original address at once and counts
// the click afterwards (waitUntil), so a slow or failing count never delays or breaks the redirect. It has no Access in
// front of it and only reads and counts links; it never sends anything.
const CODE = new RegExp('^/([A-Za-z0-9]{'+CODE_LENGTH+'})[^A-Za-z0-9]*$');
const HEADERS = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
function page(status: number, title: string, text: string): Response {
 return new Response('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{font:17px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7f9;color:#1f2933}main{padding:24px;text-align:center}h1{font-size:20px;margin:0 0 6px}p{margin:0;color:#52606d}</style><main><h1>'+title+'</h1><p>'+text+'</p></main></html>',{status,headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}});
}
export async function redirect(request: Request, env: Env, waitUntil: (p: Promise<unknown>) => void): Promise<Response> {
 const url = new URL(request.url);
 if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed',{status:405,headers:{...HEADERS,Allow:'GET, HEAD'}});
 if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n',{headers:{...HEADERS,'Content-Type':'text/plain'}});
 const code = CODE.exec(url.pathname)?.[1];
 if (!code) return page(404,'הקישור לא נמצא','ייתכן שהקישור הועתק באופן חלקי.');
 let link: Link | null;
 try { link = await env.DB.prepare('SELECT code,url,send_id,peer_number,created_at FROM links WHERE code=?').bind(code).first<Link>(); }
 catch { return page(503,'שגיאה זמנית','לא ניתן לפתוח את הקישור כרגע. נסו שוב בעוד כמה דקות.'); }
 if (!link) return page(404,'הקישור לא נמצא','ייתכן שהקישור הועתק באופן חלקי.');
 // HEAD requests are only ever automatic checks, so they are redirected without counting.
 if (request.method === 'GET') { const now = Date.now(); waitUntil(recordClick(env,link,classify(request,link.created_at,now),now).catch(() => undefined)); }
 return new Response(null,{status:302,headers:{...HEADERS,Location:link.url}});
}
export default {fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> { return redirect(request,env,p => ctx.waitUntil(p)); }};

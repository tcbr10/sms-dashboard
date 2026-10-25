import {Env} from '../../../shared/validation';
import {CODE_LENGTH,LINK_SELECT,Link,ShortLink,classify,recordClick,recordShortClick} from '../../../shared/links';
import {audit} from '../../../shared/records';
// Links Worker: the public short-link address. GET /<code> redirects to the link's original address at once and counts
// the click afterwards (waitUntil), so a slow or failing count never delays or breaks the redirect. A path that is not an
// SMS link is looked up among the general links of the admin links tab (lowercase names). /x/<code> is a recipient's
// opt-out page (sends with a sender ID carry it). It has no Access in front of it and never sends anything.
const CODE = new RegExp('^/([A-Za-z0-9]{'+CODE_LENGTH+'})[^A-Za-z0-9]*$');
const NAME = /^\/([A-Za-z0-9][A-Za-z0-9-]{0,38}[A-Za-z0-9])[^A-Za-z0-9-]*$/;
const OPTOUT = new RegExp('^/x/([A-Za-z0-9]{'+CODE_LENGTH+'})[^A-Za-z0-9]*$');
const HEADERS = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!);
function page(status: number, title: string, text: string, form = ''): Response {
 return new Response('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{font:17px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7f9;color:#1f2933}main{padding:24px;text-align:center;max-width:420px}h1{font-size:20px;margin:0 0 6px}p{margin:0;color:#52606d}form{margin-top:20px}button{font:inherit;font-weight:600;min-height:48px;padding:0 24px;border:0;border-radius:10px;background:#c2410c;color:#fff;cursor:pointer}</style><main><h1>'+esc(title)+'</h1><p>'+esc(text)+'</p>'+form+'</main></html>',{status,headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'"}});
}
const notFound = () => page(404,'הקישור לא נמצא','ייתכן שהקישור הועתק באופן חלקי.');
const unavailable = () => page(503,'שגיאה זמנית','לא ניתן לפתוח את הקישור כרגע. נסו שוב בעוד כמה דקות.');
// Opening the opt-out link only asks; the button (a POST) opts the number out. Link previews and scanners open links
// with GET, so they can never remove anyone.
async function optout(request: Request, env: Env, code: string): Promise<Response> {
 let row: {peer_number:string;opted:number}|null;
 try { row = await env.DB.prepare('SELECT c.peer_number,EXISTS (SELECT 1 FROM opt_outs o WHERE o.number=c.peer_number) AS opted FROM optout_codes c WHERE c.code=?').bind(code).first(); }
 catch { return unavailable(); }
 if (!row) return notFound();
 const ending = row.peer_number.slice(-4);
 if (request.method === 'POST') {
  try { await env.DB.batch([env.DB.prepare("INSERT INTO opt_outs (number,source,created_at) VALUES (?,'link',?) ON CONFLICT(number) DO NOTHING").bind(row.peer_number,Date.now()),audit(env,'opt-out link','optout.add',row.peer_number,{source:'link'})]); }
  catch { return unavailable(); }
  return page(200,'הוסרת מרשימת התפוצה','המספר המסתיים ב-'+ending+' לא יקבל מאיתנו הודעות נוספות.');
 }
 if (row.opted) return page(200,'המספר כבר הוסר','המספר המסתיים ב-'+ending+' כבר לא מקבל מאיתנו הודעות.');
 return page(200,'הסרה מרשימת התפוצה','להפסיק לשלוח הודעות למספר המסתיים ב-'+ending+'?','<form method="post"><button type="submit">כן, להסיר אותי</button></form>');
}
export async function redirect(request: Request, env: Env, waitUntil: (p: Promise<unknown>) => void): Promise<Response> {
 const url = new URL(request.url);
 const opt = OPTOUT.exec(url.pathname)?.[1];
 if (opt && ['GET','HEAD','POST'].includes(request.method)) return optout(request,env,opt);
 if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed',{status:405,headers:{...HEADERS,Allow:'GET, HEAD'}});
 if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n',{headers:{...HEADERS,'Content-Type':'text/plain'}});
 const code = CODE.exec(url.pathname)?.[1]; const name = NAME.exec(url.pathname)?.[1]?.toLowerCase();
 if (!code && !name) return notFound();
 let link: Link | null = null; let general: ShortLink | null = null;
 try {
  if (code) link = await env.DB.prepare(LINK_SELECT).bind(code).first<Link>();
  if (!link && name) general = await env.DB.prepare('SELECT code,url,active FROM short_links WHERE code=?').bind(name).first<ShortLink>();
 } catch { return unavailable(); }
 if (!link && !general) return notFound();
 if (general && !general.active) return page(410,'הקישור אינו פעיל','הקישור הזה הופסק ואינו מוביל לשום מקום.');
 // HEAD requests are only ever automatic checks, so they are redirected without counting. A general link has no send
 // time, so only the user agent and network decide whether a click was automatic.
 if (request.method === 'GET') { const now = Date.now();
  waitUntil((link ? recordClick(env,link,classify(request,link.created_at,now),now) : recordShortClick(env,general!.code,classify(request,0,now),now)).catch(() => undefined)); }
 return new Response(null,{status:302,headers:{...HEADERS,Location:(link ?? general)!.url}});
}
export default {fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> { return redirect(request,env,p => ctx.waitUntil(p)); }};

import {Env,HttpError,json,readBody} from '../../../shared/validation';
import {RESERVED,SLUG,newShortCode,targetUrl} from '../../../shared/links';
import {loadSettings} from '../../../shared/settings';
import {User,audit} from './users';
// Links tab (admins only; the admin router checks the role). General short links: created here, at link_base/<name>,
// with a chosen or random name, an editable destination and on/off. Links in sent messages: one row per send and
// address (link_groups), whose destination can be changed after sending; every recipient's link follows the group.
const DAY = 86400000;
function title(value: unknown): string { if (value === undefined || value === null) return ''; if (typeof value !== 'string' || value.trim().length > 100) throw new HttpError(400,'Title must be at most 100 characters'); return value.trim(); }
async function taken(env: Env, code: string): Promise<boolean> {
 return !!await env.DB.prepare('SELECT 1 FROM short_links WHERE code=?1 UNION ALL SELECT 1 FROM links WHERE code=?1 LIMIT 1').bind(code).first();
}
export async function shortlinks(request: Request, path: string, url: URL, env: Env, user: User): Promise<Response> {
 if (request.method === 'GET') {
  if (path === 'links') {
   // Clicks per day for the last 30 days (Israel time), for every link.
   const since = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(Date.now()-29*DAY);
   const [links,days,settings] = await Promise.all([
    env.DB.prepare('SELECT code,url,title,active,created_by,created_at,updated_at,clicks,auto_clicks,last_click_at FROM short_links ORDER BY created_at DESC LIMIT 1000').all(),
    env.DB.prepare('SELECT code,day,clicks,auto_clicks FROM short_link_days WHERE day>=? ORDER BY day').bind(since).all<{code:string}>(),
    loadSettings(env.DB),
   ]);
   const byCode = new Map<string,unknown[]>(); for (const d of days.results) { const l = byCode.get(d.code); if (l) l.push(d); else byCode.set(d.code,[d]); }
   return json({base:settings.link_base,since,links:links.results.map(l => ({...l,days:byCode.get((l as {code:string}).code) ?? []}))});
  }
  if (path === 'links/groups') {
   // Newest sends first, 100 at a time; the time index keeps each page to its own rows.
   // The cursor is "time:id", because the links of one send share their time.
   const [at,id] = (url.searchParams.get('before') || Number.MAX_SAFE_INTEGER+':'+Number.MAX_SAFE_INTEGER).split(':').map(Number); if (!Number.isSafeInteger(at) || !Number.isSafeInteger(id)) throw new HttpError(400,'Invalid cursor');
   const rows = (await env.DB.prepare('SELECT g.id,g.send_key,g.url,g.system_number,g.created_by,g.created_at,g.recipients,g.clicked,g.clicks,g.auto_clicks,g.last_click_at,COALESCE(s.is_test,0) AS is_test,(SELECT x.value FROM senders x WHERE x.id=s.sender_id) AS sender,(SELECT l.url FROM links l WHERE l.group_id=g.id LIMIT 1) AS sent_url FROM link_groups g LEFT JOIN sends s ON s.id=g.send_key WHERE g.created_at<=?1 AND (g.created_at<?1 OR g.id<?2) ORDER BY g.created_at DESC,g.id DESC LIMIT 101').bind(at,id).all<{created_at:number;id:number}>()).results;
   return json({groups:rows.slice(0,100),next:rows.length > 100 ? rows[99].created_at+':'+rows[99].id : null});
  }
  throw new HttpError(404,'Not found');
 }
 const body = await readBody(request); const now = Date.now();
 if (path === 'links/create') {
  const target = targetUrl(body.url); const label = title(body.title);
  let code: string;
  if (body.name !== undefined && body.name !== null && body.name !== '') {
   code = typeof body.name === 'string' ? body.name.trim().toLowerCase() : '';
   if (!SLUG.test(code)) throw new HttpError(400,'A name has 2 to 40 lowercase English letters, digits or -, and does not start or end with -');
   if (RESERVED.has(code) || await taken(env,code)) throw new HttpError(409,'This name is taken');
  } else { do code = newShortCode(); while (await taken(env,code)); }
  const r = await env.DB.prepare('INSERT INTO short_links (code,url,title,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(code) DO NOTHING').bind(code,target,label,user.email,now,now).run();
  if (!r.meta.changes) throw new HttpError(409,'This name is taken');
  await audit(env,user.email,'link.create',code,{url:target}).run();
  return json({code});
 }
 if (path === 'links/save' || path === 'links/delete') {
  const code = typeof body.code === 'string' ? body.code : ''; const row = await env.DB.prepare('SELECT url FROM short_links WHERE code=?').bind(code).first<{url:string}>();
  if (!row) throw new HttpError(404,'Link not found');
  if (path === 'links/delete') { await env.DB.batch([env.DB.prepare('DELETE FROM short_link_days WHERE code=?').bind(code),env.DB.prepare('DELETE FROM short_links WHERE code=?').bind(code),audit(env,user.email,'link.delete',code,{url:row.url})]); return json({ok:true}); }
  if (typeof body.active !== 'boolean') throw new HttpError(400,'active must be true or false');
  const target = targetUrl(body.url);
  await env.DB.batch([env.DB.prepare('UPDATE short_links SET url=?,title=?,active=?,updated_at=? WHERE code=?').bind(target,title(body.title),body.active ? 1 : 0,now,code),
   audit(env,user.email,'link.update',code,{...(target !== row.url ? {from:row.url,url:target} : {}),active:body.active})]);
  return json({ok:true});
 }
 if (path === 'links/groups/save') {
  const id = body.id; if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid id');
  const row = await env.DB.prepare('SELECT url,recipients FROM link_groups WHERE id=?').bind(id).first<{url:string;recipients:number}>(); if (!row) throw new HttpError(404,'Link not found');
  const target = targetUrl(body.url);
  await env.DB.batch([env.DB.prepare('UPDATE link_groups SET url=?,updated_at=? WHERE id=?').bind(target,now,id),audit(env,user.email,'link.group',String(id),{from:row.url,url:target,recipients:row.recipients})]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

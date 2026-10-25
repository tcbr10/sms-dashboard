import {Env,HttpError} from './validation';
// Tracked links: when a send asks for it, every link in the message is replaced, for each recipient, by a short link of
// its own (link_base + '/' + a 7-character code). The links Worker redirects the code to the original address and counts
// the click on that recipient's message. Links are found in the text after variables are filled, so a link may contain
// variables, and the opt-out text is never tracked.
export const CODE_LENGTH = 7;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
// Mirrors findLinks() in the browser (LINKS_JS below); the "link detection" test runs both on the same cases.
// A link starts with http://, https:// or www., runs to the next space, and loses trailing punctuation; its host needs a dot.
const LINK = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const TRAIL = /[.,!?;:'")\]}״׳…]+$/;
const HOST = /^(?:https?:\/\/)?[^\/?#\s]+\.[^\/?#\s.]/i;
export type Found = {start:number;end:number;url:string};
export function findLinks(text: string): Found[] {
 const out: Found[] = [];
 for (const m of text.matchAll(LINK)) { const u = m[0].replace(TRAIL,''); if (!HOST.test(u)) continue; out.push({start:m.index!,end:m.index!+u.length,url:/^www\./i.test(u) ? 'https://'+u : u}); }
 return out;
}
export const LINKS_JS = String.raw`
const LINK_RE=/(?:https?:\/\/|www\.)[^\s<>"]+/gi,LINK_TRAIL=/[.,!?;:'")\]}״׳…]+$/,LINK_HOST=/^(?:https?:\/\/)?[^\/?#\s]+\.[^\/?#\s.]/i;
function findLinks(text){const out=[];for(const m of text.matchAll(LINK_RE)){const u=m[0].replace(LINK_TRAIL,'');if(!LINK_HOST.test(u))continue;out.push({start:m.index,end:m.index+u.length,url:/^www\./i.test(u)?'https://'+u:u});}return out;}
`;
// Random codes without modulo bias: bytes of 248 and above are skipped. 62^7 codes make a collision very unlikely; the
// links table's primary key refuses one if it happens, and the send retries with new codes.
export function newCode(): string {
 let code = ''; while (code.length < CODE_LENGTH) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < 248 && code.length < CODE_LENGTH) code += ALPHABET[b % 62];
 return code;
}
// Replaces each link with a new short link. Links that are already short links of this system are left alone.
export function trackLinks(text: string, base: string): {text:string;links:{code:string;url:string}[]} {
 const links: {code:string;url:string}[] = []; let out = ''; let at = 0;
 for (const f of findLinks(text)) { if (f.url.toLowerCase().startsWith(base.toLowerCase()+'/')) continue; const code = newCode(); links.push({code,url:f.url}); out += text.slice(at,f.start)+base+'/'+code; at = f.end; }
 return {text:out+text.slice(at),links};
}

// Opt-out links: each customer gets one code, kept in optout_codes and reused by every later send, so a send writes
// rows only for customers who never had one. A code collision skips that row, and the loop gives it a new code.
export async function optoutCodes(env: Env, numbers: string[], now: number): Promise<Map<string,string>> {
 const list = JSON.stringify(numbers);
 for (let attempt = 0; attempt < 4; attempt++) {
  const have = new Map((await env.DB.prepare('SELECT code,peer_number FROM optout_codes WHERE peer_number IN (SELECT value FROM json_each(?))').bind(list).all<{code:string;peer_number:string}>()).results.map(r => [r.peer_number,r.code]));
  const missing = numbers.filter(n => !have.has(n)); if (!missing.length) return have;
  await env.DB.prepare("INSERT INTO optout_codes (code,peer_number,created_at) SELECT json_extract(value,'$.c'),json_extract(value,'$.n'),? FROM json_each(?) WHERE true ON CONFLICT DO NOTHING").bind(now,JSON.stringify(missing.map(n => ({c:newCode(),n})))).run();
 }
 throw new Error('Could not create opt-out links');
}
export const optoutUrl = (base: string, code: string) => base + '/x/' + code;

// Clicks. Phones' link previews, carriers' spam filters and security scanners open links without anyone tapping them.
// A click is counted as probably automatic when its user agent looks like a bot or preview fetcher, when it comes from a
// cloud provider's network, or when it comes within seconds of the link being created (before a person could have read
// the message). Content delivery networks are not on the list because Apple's Private Relay sends real taps through them.
const BOT_AGENT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|discord|slack|curl|wget|python|httpclient|okhttp|go-http|java\/|axios|node-fetch|headless|phantom|scanner|monitor|lighthouse/i;
const CLOUD = /amazon|google|microsoft|digitalocean|ovh|hetzner|linode|oracle|alibaba|tencent|leaseweb|contabo|vultr|choopa|scaleway/i;
export const AUTO_WINDOW = 10000;
export type Click = 'human'|'auto';
export function classify(request: Request, createdAt: number, now: number): Click {
 const agent = request.headers.get('user-agent') || ''; const org = String((request as {cf?:{asOrganization?:unknown}}).cf?.asOrganization ?? '');
 return !agent || BOT_AGENT.test(agent) || CLOUD.test(org) || now - createdAt < AUTO_WINDOW ? 'auto' : 'human';
}
// D1's free plan allows 100K rows written a day, shared with receiving messages. A person tapping the same link again
// within 30 seconds is not counted again, and a link stops counting automatic opens after a few.
export const REPEAT_WINDOW = 30000; const MAX_AUTO = 5;
// url is the group's address when the link has a group (an admin may have changed where the send's links lead).
export type Link = {code:string;url:string;send_id:string;peer_number:string;created_at:number;group_id:number|null};
export const LINK_SELECT = 'SELECT l.code,COALESCE(g.url,l.url) AS url,l.send_id,l.peer_number,l.created_at,l.group_id FROM links l LEFT JOIN link_groups g ON g.id=l.group_id WHERE l.code=?';
// Counts the click on the link, on the recipient's message and on the link's group (the send's totals in the links tab,
// where clicked counts recipients). Touching messages.updated_at lets open dashboards show the click on their next poll.
export async function recordClick(env: Env, link: Link, kind: Click, now: number): Promise<boolean> {
 const counted = kind === 'human'
  ? await env.DB.prepare('UPDATE links SET clicks=clicks+1,first_click_at=COALESCE(first_click_at,?1),last_click_at=?1 WHERE code=?2 AND (last_click_at IS NULL OR last_click_at<?3) RETURNING clicks').bind(now,link.code,now-REPEAT_WINDOW).first<{clicks:number}>()
  : await env.DB.prepare('UPDATE links SET auto_clicks=auto_clicks+1 WHERE code=? AND auto_clicks<? RETURNING auto_clicks AS clicks').bind(link.code,MAX_AUTO).first<{clicks:number}>();
 if (!counted) return false;
 const key = "event_key=json_array('out','send:'||?2||':'||?3)";
 await env.DB.batch([(kind === 'human'
  ? env.DB.prepare('UPDATE messages SET clicks=COALESCE(clicks,0)+1,clicked_at=COALESCE(clicked_at,?1),updated_at=?1 WHERE '+key)
  : env.DB.prepare('UPDATE messages SET auto_clicks=COALESCE(auto_clicks,0)+1,updated_at=?1 WHERE '+key)).bind(now,link.send_id,link.peer_number),
  ...(link.group_id === null ? [] : [kind === 'human'
   ? env.DB.prepare('UPDATE link_groups SET clicks=clicks+1,clicked=clicked+?,last_click_at=? WHERE id=?').bind(counted.clicks === 1 ? 1 : 0,now,link.group_id)
   : env.DB.prepare('UPDATE link_groups SET auto_clicks=auto_clicks+1 WHERE id=?').bind(link.group_id)])]);
 return true;
}

// General short links (admin links tab, short_links): not tied to a message, at link_base/<name> where the name is chosen
// or random. Names are lowercase, so a name typed with capitals still works; random ones use lowercase letters and digits.
// They share the address space with the SMS links, which are looked up first; creating a name checks both tables.
export const SLUG = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/;
export const RESERVED = new Set(['x','api','admin','robots','favicon','www']);
export function newShortCode(): string {
 const abc = 'abcdefghijklmnopqrstuvwxyz0123456789'; let code = '';
 while (code.length < CODE_LENGTH) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < 252 && code.length < CODE_LENGTH) code += abc[b % 36];
 return code;
}
// A destination: an http(s) address of up to 2,000 characters.
export function targetUrl(value: unknown): string {
 const v = typeof value === 'string' ? value.trim() : ''; let u: URL;
 try { u = new URL(v); } catch { throw new HttpError(400,'Enter a full address starting with https://'); }
 if ((u.protocol !== 'https:' && u.protocol !== 'http:') || v.length > 2000 || /\s/.test(v)) throw new HttpError(400,'Enter a full address starting with https://');
 return v;
}
const israelDay = (ms: number) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(ms);
export type ShortLink = {code:string;url:string;active:number};
// Every click counts (a general link has no recipient to tell repeats apart), on the link and on its Israel-time day.
export async function recordShortClick(env: Env, code: string, kind: Click, now: number): Promise<void> {
 const human = kind === 'human' ? 1 : 0;
 await env.DB.batch([
  env.DB.prepare('UPDATE short_links SET clicks=clicks+?1,auto_clicks=auto_clicks+?2,last_click_at=CASE WHEN ?1=1 THEN ?3 ELSE last_click_at END WHERE code=?4').bind(human,1-human,now,code),
  env.DB.prepare('INSERT INTO short_link_days (code,day,clicks,auto_clicks) VALUES (?,?,?,?) ON CONFLICT(code,day) DO UPDATE SET clicks=clicks+excluded.clicks,auto_clicks=auto_clicks+excluded.auto_clicks').bind(code,israelDay(now),human,1-human),
 ]);
}

import {Env,HttpError,phone,recipient,text} from './validation';
import {OPTOUT_LINK,Settings,loadSettings} from './settings';
import {Fetch,micropayNumber,sendMicropay} from './micropay-send';
import {micropaySubmission} from './micropay-submission';
import {audit,sentLast24h} from './records';
import {Flow,enterMany,loadFlow,openThreads,touchThreads} from './bot';
import {hasVariables,render,unknownVariables} from './template';
import {findLinks,optoutCodes,optoutUrl,trackLinks} from './links';
// Sending, shared by the dashboard's send button and by scheduled sends run from the ingest Worker's timer.
// prepareSend checks who may send what; executeSend sends it and records the result. Opt-outs, the daily limit and
// contact data for variables are read at execution, so a scheduled send uses them as they are at its send time.
export type Sender = {email:string;role:'admin'|'user';can_bulk_send:number;daily_limit:number|null};
export type SendInput = {system_number?:unknown;body?:unknown;recipients?:unknown;flow_id?:unknown;stop_bot?:unknown;test?:unknown;bulk_preview?:unknown;bulk?:unknown;track_links?:unknown;sender_id?:unknown;batch_of?:unknown};
export type Prepared = {system:string;message:string;recipients:string[];invalid:number;duplicates:number;flow:Flow|null;stopBot:boolean;test:boolean;bulkPreview:boolean;bulk:boolean;personal:boolean;track:boolean;from:From|null;groupKey:string|null;settings:Settings};
// A sender ID the message goes out as, instead of the system number (senders table).
export type From = {id:number;kind:'phone'|'name';value:string;status:string};
export type Outcome = {status:'accepted'|'rejected'|'unknown';sent:number;counts:{accepted:number;rejected:number;unknown:number};skipped:{invalid:number;duplicates:number;opted_out:number};task_id:string|null;error:string|null;duplicate?:boolean};
// Without listjson, each distinct personalized text (and every tracked send, whose links differ per recipient) is one Micropay call, and the free plan allows 50 outgoing calls per
// request; larger personalized sends are split into batches of this many recipients.
export const PERSONAL_BATCH = 40;

export async function prepareSend(env: Env, sender: Sender, input: SendInput, normalized?: {recipients:string[];invalid:number;duplicates:number}): Promise<Prepared> {
 const settings = await loadSettings(env.DB); const admin = sender.role === 'admin'; const system = phone(input.system_number);
 const allowed = admin ? await env.DB.prepare('SELECT 1 FROM system_numbers WHERE number=? AND active=1').bind(system).first() : await env.DB.prepare('SELECT 1 FROM user_numbers u JOIN system_numbers s ON s.number=u.system_number WHERE u.email=? AND u.system_number=? AND u.can_send=1 AND s.active=1').bind(sender.email,system).first();
 if (!allowed) throw new HttpError(403,'Sending from this number is not allowed');
 // A send can start a bot flow: the message is the flow's first step, and the recipients' replies continue the flow.
 const flow = input.flow_id === undefined || input.flow_id === null ? null : Number.isSafeInteger(input.flow_id) ? await loadFlow(env,input.flow_id as number) : null;
 if (input.flow_id !== undefined && input.flow_id !== null && (!flow || !flow.active || flow.system_number !== system || !flow.steps.length)) throw new HttpError(400,'This flow is not active on this number');
 const message = flow ? flow.steps[0].text : text(input.body,'message',1000); if (!message.trim()) throw new HttpError(400,'Message is empty');
 const test = input.test === true;
 let list = normalized;
 if (!list) {
  if (!Array.isArray(input.recipients) || !input.recipients.length) throw new HttpError(400,'Add at least one recipient'); if (input.recipients.length > 10000) throw new HttpError(413,'Too many recipients');
  if (test && input.recipients.length !== 1) throw new HttpError(400,'A test goes to exactly one number');
  const unique = new Set<string>(); let invalid = 0;
  for (const r of input.recipients) { try { const n = recipient(r); if (!settings.allow_international && !n.startsWith('+972')) throw new Error(); unique.add(n); } catch { invalid++; } }
  list = {recipients:[...unique],invalid,duplicates:input.recipients.length - invalid - unique.size};
 }
 if (list.recipients.length > 1 && !admin && !sender.can_bulk_send) throw new HttpError(403,'Sending to more than one recipient is not allowed for this user');
 if (list.recipients.length > settings.max_recipients) throw new HttpError(413,'Too many recipients (the limit is '+settings.max_recipients+')');
 const personal = hasVariables(message);
 if (personal) { const unknown = unknownVariables(message,settings.contact_fields); if (unknown.length) throw new HttpError(400,'Unknown variable: {'+unknown.join('}, {')+'}'); }
 const track = input.track_links === true;
 // batch_of names the whole send when it goes out in batches (the browser's first send ID, or the scheduled send's ID),
 // so its tracked links are listed and edited together.
 if (input.batch_of !== undefined && input.batch_of !== null && (typeof input.batch_of !== 'string' || !/^[0-9a-f-]{36}$/.test(input.batch_of))) throw new HttpError(400,'Invalid batch_of');
 const groupKey = typeof input.batch_of === 'string' ? input.batch_of : null;
 // A sender ID must be active and assigned to the sender (admins may use all of them), checked again when a scheduled
 // send goes out. Replies to it don't reach this system, so it can't start a bot flow, and a send to several
 // recipients carries a personal opt-out link instead of "reply to opt out".
 let from: From|null = null;
 if (input.sender_id !== undefined && input.sender_id !== null) {
  if (!Number.isSafeInteger(input.sender_id)) throw new HttpError(400,'Invalid sender ID');
  from = await env.DB.prepare("SELECT s.id,s.kind,s.value,s.status FROM senders s WHERE s.id=?1 AND s.active=1 AND s.status!='rejected' AND (?2=1 OR EXISTS (SELECT 1 FROM sender_users u WHERE u.sender_id=s.id AND u.email=?3))").bind(input.sender_id,admin?1:0,sender.email).first<From>();
  if (!from) throw new HttpError(403,'This sender ID is not available to you');
  if (flow) throw new HttpError(400,'A bot flow can only be sent from the system number');
  if ((list.recipients.length > 1 || input.bulk === true || (test && input.bulk_preview === true)) && !(settings.optout_link_text && settings.link_base)) throw new HttpError(400,'Set the opt-out link text and the short link address in Settings before sending to several recipients with a sender ID');
 }
 if (track && !settings.link_base) throw new HttpError(400,'Link tracking is not set up'); if (track && !findLinks(message).length) throw new HttpError(400,'The message has no links to track');
 return {system,message,...list,flow,stopBot:input.stop_bot === true && !flow,test,bulkPreview:input.bulk_preview === true,bulk:list.recipients.length > 1 || input.bulk === true,personal,track,from,groupKey,settings};
}

// Sends to the given recipients (all of p.recipients, or one batch of them). The ID is claimed in sends before
// Micropay is called, so a repeated ID returns without sending again. desc goes to Micropay's campaign description.
export async function executeSend(env: Env, fetcher: Fetch, token: string, id: string, sender: Sender, p: Prepared, recipients: string[], desc: string): Promise<Outcome> {
 const previous = await env.DB.prepare('SELECT email,status,recipients FROM sends WHERE id=?').bind(id).first<{email:string;status:string;recipients:number}>();
 if (previous) { if (previous.email !== sender.email) throw new HttpError(409,'Send ID already used'); return {status:previous.status as Outcome['status'],sent:previous.recipients,counts:{accepted:0,rejected:0,unknown:0},skipped:{invalid:0,duplicates:0,opted_out:0},task_id:null,error:null,duplicate:true}; }
 const {settings,system,test} = p; const admin = sender.role === 'admin';
 const blocked = new Set((await env.DB.prepare('SELECT number FROM opt_outs WHERE number IN (SELECT value FROM json_each(?))').bind(JSON.stringify(recipients)).all<{number:string}>()).results.map(r => r.number));
 const to = recipients.filter(n => !blocked.has(n)); if (!to.length) throw new HttpError(400,'No valid recipients left to send to');
 if (!admin) { const limit = sender.daily_limit ?? settings.default_daily_limit; const used = await sentLast24h(env,sender.email); if (used + to.length > limit) throw new HttpError(429,'Daily limit reached: '+used+' of '+limit+' recipients used in the last 24 hours'); }
 const bulk = p.bulk || (test && p.bulkPreview);
 // With a sender ID, each recipient's opt-out link is their own, so every text differs.
 const optLinks = p.from && bulk ? await optoutCodes(env,to,Date.now()) : null;
 const distinct = p.personal || p.track || !!optLinks; const listjson = distinct && settings.micropay_listjson;
 if (distinct && !listjson && to.length > PERSONAL_BATCH) throw new HttpError(413,'Personalized messages go out in batches of up to '+PERSONAL_BATCH+' recipients');
 // Variables are rendered per recipient; without listjson, recipients whose text comes out the same share one call.
 const withOptout = (t: string, n?: string) => optLinks && n ? t + '\n' + settings.optout_link_text.replace(OPTOUT_LINK,optoutUrl(settings.link_base,optLinks.get(n)!)) : bulk && settings.optout_text && !t.includes(settings.optout_text) ? t + '\n' + settings.optout_text : t;
 const contacts = new Map<string,Record<string,string>>(p.personal ? (await env.DB.prepare('SELECT number,data FROM contacts WHERE number IN (SELECT value FROM json_each(?))').bind(JSON.stringify(to)).all<{number:string;data:string}>()).results.map(r => [r.number,JSON.parse(r.data)]) : []);
 // Builds every recipient's text. Tracked links get new codes on each call, so a code collision is retried with new ones.
 const build = () => {
  const texts = new Map<string,string>(); const groups = new Map<string,string[]>(); const links: {code:string;url:string;number:string}[] = [];
  for (const n of to) { let t = p.personal ? render(p.message,settings.contact_fields,contacts.get(n) ?? null,n) : p.message;
   if (p.track) { const r = trackLinks(t,settings.link_base); t = r.text; for (const l of r.links) links.push({...l,number:n}); }
   t = withOptout(t,n);
   if (!t.trim()) throw new HttpError(400,'The message comes out empty for '+n); if (t.length > 1000) throw new HttpError(400,distinct ? 'The message is too long for '+n : 'Message is too long once the opt-out text is added');
   texts.set(n,t); const g = groups.get(t); if (g) g.push(n); else groups.set(t,[n]); }
  return {texts,groups,links};
 };
 const now = Date.now();
 const claimSend = env.DB.prepare("INSERT INTO sends (id,email,system_number,body,recipients,status,created_at,is_test,sender_id) VALUES (?,?,?,?,?,'sending',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,sender.email,system,withOptout(p.message),to.length,now,test?1:0,p.from?.id ?? null);
 // The send is claimed and its links stored in one transaction, before Micropay is called, so a link works as soon as it arrives.
 // Each link of the message is a group (one per send and address, link_groups): the redirect reads its address from the
 // group, so changing where a sent link leads is one row, and the links tab lists groups rather than every recipient.
 const key = p.groupKey ?? id;
 const groupRows = (links: {url:string}[]) => { const n = new Map<string,number>(); for (const l of links) n.set(l.url,(n.get(l.url) ?? 0)+1); return [...n].map(([url,count]) => ({url,n:count})); };
 let built = build(); let claim: D1Result;
 for (let attempt = 1;; attempt++) {
  try { claim = built.links.length ? (await env.DB.batch([claimSend,
   env.DB.prepare("INSERT INTO link_groups (send_key,url,system_number,created_by,created_at,recipients,updated_at) SELECT ?1,json_extract(value,'$.url'),?2,?3,?4,json_extract(value,'$.n'),?4 FROM json_each(?5) WHERE true ON CONFLICT(send_key,url) DO UPDATE SET recipients=link_groups.recipients+excluded.recipients,updated_at=excluded.updated_at").bind(key,system,sender.email,now,JSON.stringify(groupRows(built.links))),
   env.DB.prepare("INSERT INTO links (code,send_id,system_number,peer_number,url,created_at,group_id) SELECT json_extract(value,'$.code'),?1,?2,json_extract(value,'$.number'),json_extract(value,'$.url'),?3,(SELECT g.id FROM link_groups g WHERE g.send_key=?4 AND g.url=json_extract(value,'$.url')) FROM json_each(?5)").bind(id,system,now,key,JSON.stringify(built.links))]))[0] : await claimSend.run(); break; }
  catch (e) { if (attempt >= 3 || !built.links.length || !/UNIQUE/i.test(String(e))) throw e; built = build(); }
 }
 const {texts,groups,links} = built;
 if (!claim.meta.changes) {
  // Another request claimed this ID at the same moment; the links just stored belong to nothing.
  if (links.length) await env.DB.batch([env.DB.prepare("DELETE FROM links WHERE code IN (SELECT json_extract(value,'$.code') FROM json_each(?))").bind(JSON.stringify(links)),
   ...groupRows(links).map(g => env.DB.prepare('UPDATE link_groups SET recipients=recipients-? WHERE send_key=? AND url=?').bind(g.n,key,g.url)),
   env.DB.prepare('DELETE FROM link_groups WHERE send_key=? AND recipients<=0').bind(key)]);
  return {status:'unknown',sent:to.length,counts:{accepted:0,rejected:0,unknown:0},skipped:{invalid:p.invalid,duplicates:p.duplicates,opted_out:blocked.size},task_id:null,error:null,duplicate:true};
 }
 const tracked = new Set(links.map(l => l.number));
 // listjson: one call with each number's own text. Otherwise one call per distinct text, up to six at a time.
 type Call = {numbers:string[];result:Awaited<ReturnType<typeof sendMicropay>>};
 let calls: Call[];
 // Micropay takes a phone sender ID in its local form, and a text one as it is.
 const as = p.from ? (p.from.kind === 'phone' ? micropayNumber(p.from.value) : p.from.value) : undefined;
 if (listjson) calls = [{numbers:to,result:await sendEach(fetcher,token,as ?? micropayNumber(system),to.map(n => [n,texts.get(n)!]),desc)}];
 else { const entries = [...groups]; calls = new Array(entries.length); let next = 0;
  await Promise.all(Array.from({length:Math.min(6,entries.length)},async () => { while (next < entries.length) { const i = next++; calls[i] = {numbers:entries[i][1],result:await sendMicropay(fetcher,token,{from:system,to:entries[i][1],body:entries[i][0],desc,sender:as})}; } })); }
 const counts = {accepted:0,rejected:0,unknown:0}; for (const c of calls) counts[c.result.submission_status] += c.numbers.length;
 const status = counts.accepted === to.length ? 'accepted' : counts.rejected === to.length ? 'rejected' : 'unknown';
 const error = calls.find(c => c.result.error)?.result.error ?? null;
 // Messages with tracked links start at 0 clicks; others keep NULL, which the clicks column shows as no links.
 // A send that starts a flow asks its first question, which the chats page shows with the flow's options.
 const bot = p.flow ? JSON.stringify({flow:p.flow.id,step:p.flow.steps[0].id,start:true}) : null;
 const rows = calls.flatMap(c => c.numbers.map(n => ({number:n,body:texts.get(n)!,status:c.result.submission_status,task:c.result.task_id ?? null,clicks:tracked.has(n) ? 0 : null,bot})));
 // Never retried automatically: an unknown result may still have been sent.
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,provider_message_id,updated_at,sent_by,send_id,clicks,auto_clicks,bot,sender) SELECT json_array('out','send:'||?1||':'||json_extract(value,'$.number')),'out',?2,json_extract(value,'$.number'),json_extract(value,'$.body'),?3,?3,'workflow',json_extract(value,'$.status'),json_extract(value,'$.task'),?3,?4,?1,json_extract(value,'$.clicks'),json_extract(value,'$.clicks'),json_extract(value,'$.bot'),?6 FROM json_each(?5) WHERE true ON CONFLICT(event_key) DO NOTHING`).bind(id,system,now,sender.email,JSON.stringify(rows),p.from?.value ?? null),
  touchThreads(env,system,to,now,now),
  // A text sender name is confirmed by Micropay accepting it, or marked rejected when Micropay refuses it as unapproved.
  ...(p.from?.kind === 'name' && counts.accepted ? [env.DB.prepare("UPDATE senders SET status='confirmed',updated_at=? WHERE id=? AND status='unconfirmed'").bind(now,p.from.id)] : []),
  ...(p.from?.kind === 'name' && calls.some(c => /sender id not approved/i.test(c.result.error ?? '')) ? [env.DB.prepare("UPDATE senders SET status='rejected',updated_at=? WHERE id=?").bind(now,p.from.id)] : []),
  env.DB.prepare('UPDATE sends SET status=?,task_id=?,error=?,finished_at=? WHERE id=?').bind(status,calls.length === 1 ? calls[0].result.task_id ?? null : null,error,Date.now(),id),
  audit(env,sender.email,'send',system,{id,recipients:to.length,status,...(distinct?{personalized:true,calls:calls.length}:{}),...(links.length?{tracked_links:links.length}:{}),...(p.from?{sender:p.from.value}:{}),...(test?{test:true}:{}),...(p.flow?{flow:p.flow.id}:{}),...(p.stopBot?{stop_bot:true}:{})}),
 ]);
 // Bot state follows only recipients the send may have reached. Starting a flow lifts a bot block for them.
 const reached = rows.filter(r => r.status !== 'rejected').map(r => r.number); const list = JSON.stringify(reached);
 if (reached.length && !test && (p.flow || p.stopBot)) await env.DB.batch(p.flow
  ? [env.DB.prepare('DELETE FROM bot_blocks WHERE system_number=? AND peer_number IN (SELECT value FROM json_each(?))').bind(system,list),enterMany(env,p.flow,p.flow.steps[0],system,reached,now),openThreads(env,system,reached,p.flow.id,now)]
  : [env.DB.prepare('INSERT INTO bot_blocks (system_number,peer_number,created_at,created_by) SELECT ?,value,?,? FROM json_each(?) WHERE true ON CONFLICT DO NOTHING').bind(system,now,sender.email,list),env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number IN (SELECT value FROM json_each(?))').bind(system,list),touchThreads(env,system,reached,now,now)]);
 return {status,sent:to.length,counts,skipped:{invalid:p.invalid,duplicates:p.duplicates,opted_out:blocked.size},task_id:calls.length === 1 ? calls[0].result.task_id ?? null : null,error:status === 'accepted' ? null : error};
}
// Micropay's listjson: one call where each number gets its own text (it replaces list and msg). from is in Micropay's format.
async function sendEach(fetcher: Fetch, token: string, from: string, texts: [string,string][], desc: string): Promise<Awaited<ReturnType<typeof sendMicropay>>> {
 try {
  const response = await fetcher('https://www.micropay.co.il/extApi/scheduleSms.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,from,listjson:Object.fromEntries(texts.map(([n,t]) => [micropayNumber(n),t.replace(/\r?\n/g,'\r\n')])),desc}),signal:AbortSignal.timeout(25000)});
  const raw = (await response.text()).slice(0,2000); const result = response.ok ? micropaySubmission(raw) : {submission_status:'unknown' as const};
  return {...result,error:result.submission_status === 'accepted' ? null : ('HTTP '+response.status+' '+raw).slice(0,300)};
 } catch { return {submission_status:'unknown',error:'Micropay did not answer in time; the message may or may not have been sent'}; }
}

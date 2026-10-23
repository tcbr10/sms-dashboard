import {Env,HttpError,json,readBody,recipient,text} from '../../../shared/validation';
import {micropayNumber} from '../../../shared/micropay-send';
import {User,audit} from './users';
import {Fetcher} from './send';
// Sender IDs (admins only; the admin router checks the role): what recipients see as the sender instead of the system
// number. A phone number is verified with Micropay's senderVerify.php: a code goes to that number by SMS or a voice
// call, and the code typed back adds it to the Micropay account. A text name has no API approval; it must be approved
// in Micropay's site, is registered here as unconfirmed, and becomes confirmed (or rejected) by the first send with it.
// Admins choose which users may send as each sender; admins may use them all.
export const MICROPAY_SENDER_VERIFY = 'https://www.micropay.co.il/extApi/senderVerify.php';
type Verify = {result:'CODE_SENT'|'OK'|'WRONG_CODE'|'PHONE_EXIST'|'MAX_SENT'|'ERROR'|'UNKNOWN';description:string};
// Micropay answers in JSON ({"status":1,"message":"CODE_SENT"}) or plain text ("CODE_SENT", "ERROR --> Description: …").
export function verifyResult(raw: string): Verify {
 const known = ['CODE_SENT','OK','WRONG_CODE','PHONE_EXIST','MAX_SENT','ERROR'] as const; const t = raw.trim();
 try { const d = JSON.parse(t) as {message?:unknown;data?:{description?:unknown}}; const m = String(d.message ?? ''); return {result:(known as readonly string[]).includes(m) ? m as Verify['result'] : 'UNKNOWN',description:String(d.data?.description ?? '').slice(0,200)}; }
 catch { const first = t.split(/\s/)[0]; return {result:(known as readonly string[]).includes(first) ? first as Verify['result'] : 'UNKNOWN',description:t.replace(/^ERROR\s*(-->)?\s*(Description:)?\s*/,'').slice(0,200)}; }
}
async function verify(fetcher: Fetcher, token: string, body: Record<string,string>): Promise<Verify> {
 try {
  const r = await fetcher(MICROPAY_SENDER_VERIFY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...body}),signal:AbortSignal.timeout(20000)});
  return verifyResult((await r.text()).slice(0,2000));
 } catch { return {result:'UNKNOWN',description:'Micropay did not answer in time'}; }
}
// Israeli landlines and mobiles only (Micropay refuses 1700/1800 and foreign numbers; the phone parser has no 1 prefix).
function israeli(value: unknown): string { const n = recipient(value); if (!n.startsWith('+972')) throw new HttpError(400,'Only Israeli numbers can be sender IDs'); return n; }
function label(value: unknown): string { if (value === undefined || value === null) return ''; if (typeof value !== 'string' || value.trim().length > 50) throw new HttpError(400,'Description must be at most 50 characters'); return value.trim(); }
// Micropay's rule for text sender IDs: 2 to 11 characters, English letters, digits, space, + and *. A name needs a letter,
// so it can't be mistaken for a number.
export function senderName(value: unknown): string { const v = typeof value === 'string' ? value.trim() : ''; if (!/^[A-Za-z0-9 +*]{2,11}$/.test(v) || !/[A-Za-z]/.test(v)) throw new HttpError(400,'A sender name has 2 to 11 English letters, digits, spaces, + or *, with at least one letter'); return v; }
function failed(v: Verify): never {
 if (v.result === 'WRONG_CODE') throw new HttpError(400,'Wrong code');
 if (v.result === 'MAX_SENT') throw new HttpError(429,'Too many codes for this number; wait 15 minutes');
 if (v.result === 'ERROR') throw new HttpError(400,'Micropay refused: '+(v.description || 'no description'));
 throw new HttpError(502,'Micropay gave an unexpected answer'+(v.description ? ': '+v.description : ''));
}
function addVerified(env: Env, user: User, value: string, desc: string, how: string): D1PreparedStatement[] {
 const now = Date.now();
 return [env.DB.prepare("INSERT INTO senders (kind,value,label,status,created_by,created_at,updated_at) VALUES ('phone',?,?,'verified',?,?,?) ON CONFLICT(value) DO UPDATE SET status='verified',active=1,label=CASE WHEN excluded.label='' THEN senders.label ELSE excluded.label END,updated_at=excluded.updated_at").bind(value,desc,user.email,now,now),
  audit(env,user.email,'sender.add',value,{kind:'phone',how})];
}
export async function senders(request: Request, path: string, env: Env, user: User, fetcher: Fetcher): Promise<Response> {
 if (request.method === 'GET') {
  if (path !== 'senders') throw new HttpError(404,'Not found');
  const rows = await env.DB.prepare('SELECT s.id,s.kind,s.value,s.label,s.status,s.active,s.created_by,s.created_at,(SELECT json_group_array(u.email) FROM sender_users u WHERE u.sender_id=s.id) AS users FROM senders s ORDER BY s.active DESC,s.label,s.value').all<{users:string}>();
  return json({senders:rows.results.map(r => ({...r,users:JSON.parse(r.users)}))});
 }
 const body = await readBody(request); const token = env.MICROPAY_TOKEN;
 if (path === 'senders/code' || path === 'senders/verify') {
  if (!token) throw new HttpError(503,'Sending is not configured');
  const number = israeli(body.phone); const local = micropayNumber(number);
  if (await env.DB.prepare("SELECT 1 FROM senders WHERE value=? AND status='verified' AND active=1").bind(number).first()) throw new HttpError(409,'This number is already a sender ID');
  if (path === 'senders/code') {
   const type = body.type === undefined ? 'auto' : body.type; if (type !== 'auto' && type !== 'sms' && type !== 'vms') throw new HttpError(400,'type must be auto, sms or vms');
   const v = await verify(fetcher,token,{phone:local,type});
   // A number already verified in the Micropay account needs no code.
   if (v.result === 'PHONE_EXIST') { await env.DB.batch(addVerified(env,user,number,label(body.desc),'already verified in Micropay')); return json({added:true}); }
   if (v.result !== 'CODE_SENT') failed(v);
   await audit(env,user.email,'sender.code',number,{type}).run();
   return json({sent:true});
  }
  const code = text(body.code,'code',10).trim(); if (!/^[0-9]{3,8}$/.test(code)) throw new HttpError(400,'The code is digits only'); const desc = label(body.desc);
  const v = await verify(fetcher,token,{phone:local,code,...(desc ? {desc} : {})});
  if (v.result !== 'OK' && v.result !== 'PHONE_EXIST') failed(v);
  await env.DB.batch(addVerified(env,user,number,desc,'code'));
  return json({added:true});
 }
 if (path === 'senders/name') {
  const name = senderName(body.name); const now = Date.now();
  const r = await env.DB.prepare("INSERT INTO senders (kind,value,label,status,created_by,created_at,updated_at) VALUES ('name',?,?,'unconfirmed',?,?,?) ON CONFLICT(value) DO NOTHING").bind(name,label(body.desc),user.email,now,now).run();
  if (!r.meta.changes) throw new HttpError(409,'This sender name already exists');
  await audit(env,user.email,'sender.add',name,{kind:'name'}).run();
  return json({added:true});
 }
 const id = body.id; if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid id');
 const row = await env.DB.prepare('SELECT value FROM senders WHERE id=?').bind(id).first<{value:string}>(); if (!row) throw new HttpError(404,'Sender ID not found');
 if (path === 'senders/save') {
  if (typeof body.active !== 'boolean') throw new HttpError(400,'active must be true or false');
  if (!Array.isArray(body.users) || body.users.length > 1000 || body.users.some(e => typeof e !== 'string')) throw new HttpError(400,'users must be a list of emails');
  const emails = [...new Set(body.users as string[])];
  const known = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE email IN (SELECT value FROM json_each(?))').bind(JSON.stringify(emails)).first<{n:number}>())?.n ?? 0; if (known !== emails.length) throw new HttpError(400,'Unknown user');
  await env.DB.batch([
   env.DB.prepare('UPDATE senders SET label=?,active=?,updated_at=? WHERE id=?').bind(label(body.label),body.active ? 1 : 0,Date.now(),id),
   env.DB.prepare('DELETE FROM sender_users WHERE sender_id=?').bind(id),
   env.DB.prepare('INSERT INTO sender_users (sender_id,email) SELECT ?,value FROM json_each(?)').bind(id,JSON.stringify(emails)),
   audit(env,user.email,'sender.update',row.value,{active:body.active,users:emails}),
  ]);
  return json({ok:true});
 }
 if (path === 'senders/delete') {
  await env.DB.batch([env.DB.prepare('DELETE FROM sender_users WHERE sender_id=?').bind(id),env.DB.prepare('DELETE FROM senders WHERE id=?').bind(id),audit(env,user.email,'sender.delete',row.value)]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

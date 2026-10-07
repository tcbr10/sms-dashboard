import {Env,HttpError,json,phone,readBody,recipient,text} from '../../../shared/validation';
import {loadSettings,isOptOut} from '../../../shared/settings';
import {User,audit} from './users';
// Admin import of message history from a spreadsheet. The browser maps the file's columns and parses dates; the server
// validates every row again and stores it like an ingested message. Nothing is ever sent.
const WINDOW = 600000; // a row without a message ID is a duplicate of the same message within 10 minutes
const MAX_ROWS = 500, MAX_FILE_ROWS = 12000;
type Row = {key:string;dir:'in'|'out';sn:string;peer:string;body:string;t:number|null;status:string|null;mid:string|null};
async function sha256(s: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2,'0')).join(''); }
function int(v: unknown, name: string, min: number, max: number): number { if (!Number.isSafeInteger(v) || (v as number) < min || (v as number) > max) throw new HttpError(400,'Invalid '+name); return v as number; }
// Each row error is reported with the file row number, so the admin can fix the file.
async function parse(raw: unknown, active: Set<string>): Promise<Row> {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('שורה לא תקינה');
 const r = raw as Record<string,unknown>; const dir = r.direction; if (dir !== 'in' && dir !== 'out') throw new Error('כיוון לא תקין');
 let sn: string; try { sn = phone(r.system_number); } catch { throw new Error('מספר מערכת לא תקין'); } if (!active.has(sn)) throw new Error('מספר המערכת אינו רשום או אינו פעיל');
 let peer: string; try { peer = recipient(r.peer_number); } catch { throw new Error('מספר הלקוח אינו תקין'); }
 if (typeof r.body !== 'string' || !r.body.trim()) throw new Error('ההודעה ריקה'); if (r.body.length > 10000) throw new Error('ההודעה ארוכה מדי');
 const t = r.occurred_at === null || r.occurred_at === undefined ? null : r.occurred_at; if (t !== null && (!Number.isSafeInteger(t) || (t as number) < Date.UTC(2000,0,1) || (t as number) > Date.now()+86400000)) throw new Error('תאריך לא תקין');
 const status = dir === 'out' ? (r.status ?? 'accepted') : null; if (status !== null && !['pending','accepted','rejected','unknown'].includes(status as string)) throw new Error('סטטוס לא תקין');
 const mid = r.msgid === null || r.msgid === undefined || r.msgid === '' ? null : String(r.msgid).trim(); if (mid !== null && (!mid || mid.length > 256)) throw new Error('מזהה הודעה לא תקין');
 const n = r.n === undefined ? 0 : int(r.n,'n',0,MAX_FILE_ROWS);
 // A Micropay message ID gives the same key as the live webhook, so messages that already arrived are skipped. Without one,
 // the key is built from the content, so uploading the same file again adds nothing; n tells identical rows of one file apart.
 const key = mid !== null ? JSON.stringify([dir,mid]) : JSON.stringify([dir,'import',sn,peer,t ?? '',await sha256(r.body as string),n]);
 return {key,dir,sn,peer,body:r.body as string,t:t as number|null,status:status as string|null,mid};
}
export async function imports(request: Request, path: string, env: Env, user: User): Promise<Response> {
 if (request.method === 'GET') return json({imports:(await env.DB.prepare('SELECT id,email,file,created_at,total,added,duplicates,invalid,undone_at,undone_by FROM imports ORDER BY id DESC LIMIT 50').all()).results});
 const body = await readBody(request, 1048576);
 if (path === 'imports/start') {
  const file = text(typeof body.file === 'string' ? body.file.trim().slice(0,200) : body.file,'file',200); const total = int(body.total,'total',1,20000); const skipped = body.invalid === undefined ? 0 : int(body.invalid,'invalid',0,total);
  const row = await env.DB.prepare('INSERT INTO imports (email,file,created_at,total,invalid) VALUES (?,?,?,?,?) RETURNING id').bind(user.email,file,Date.now(),total,skipped).first<{id:number}>();
  await audit(env,user.email,'messages.import',null,{import_id:row!.id,file,total,invalid:skipped}).run();
  return json({id:row!.id});
 }
 const id = int(body.id,'import id',1,Number.MAX_SAFE_INTEGER);
 const current = await env.DB.prepare('SELECT undone_at FROM imports WHERE id=?').bind(id).first<{undone_at:number|null}>(); if (!current) throw new HttpError(404,'Import not found');
 if (path === 'imports/undo') {
  if (current.undone_at) throw new HttpError(409,'This import was already undone');
  const r = await env.DB.batch([env.DB.prepare('DELETE FROM messages WHERE import_id=?').bind(id),env.DB.prepare('UPDATE imports SET undone_at=?,undone_by=? WHERE id=?').bind(Date.now(),user.email,id)]);
  await audit(env,user.email,'messages.import.undo',null,{import_id:id,removed:r[0].meta.changes}).run();
  return json({removed:r[0].meta.changes});
 }
 if (path !== 'imports/rows') throw new HttpError(404,'Not found');
 if (current.undone_at) throw new HttpError(409,'This import was undone');
 if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > MAX_ROWS) throw new HttpError(400,'Send between 1 and '+MAX_ROWS+' rows');
 const [numbers,settings] = await Promise.all([env.DB.prepare('SELECT number FROM system_numbers WHERE active=1').all<{number:string}>(),loadSettings(env.DB)]);
 const active = new Set(numbers.results.map(n => n.number)); const valid: Row[] = []; const invalid: {row:number;reason:string}[] = [];
 for (const raw of body.rows) { const at = Number.isSafeInteger((raw as Record<string,unknown>)?.row) ? (raw as {row:number}).row : 0; try { valid.push(await parse(raw,active)); } catch (e) { invalid.push({row:at,reason:e instanceof Error ? e.message : 'שורה לא תקינה'}); } }
 const keys = new Set<string>(); const rows = valid.filter(r => !keys.has(r.key) && keys.add(r.key)); const now = Date.now();
 let added = 0;
 if (rows.length) {
  const payload = JSON.stringify(rows); const optouts = rows.filter(r => r.dir === 'in' && r.body.length <= 30 && isOptOut(r.body,settings.optout_keywords)).map(r => r.key);
  // One statement for the whole batch (the free plan allows 50 queries per request). The duplicate check seeks the
  // conversation index; the SELECT is read in full before inserting, so repeats inside one file are not compared to each other.
  const results = await env.DB.batch([
   env.DB.prepare(`INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,updated_at,import_id)
    SELECT r.k,r.d,r.sn,r.p,r.b,COALESCE(r.t,?1),?1,CASE WHEN r.t IS NULL THEN 'receipt' ELSE 'provider' END,r.s,?1,?2 FROM (SELECT json_extract(value,'$.key') AS k,json_extract(value,'$.dir') AS d,json_extract(value,'$.sn') AS sn,json_extract(value,'$.peer') AS p,json_extract(value,'$.body') AS b,json_extract(value,'$.t') AS t,json_extract(value,'$.status') AS s,json_extract(value,'$.mid') AS mid FROM json_each(?3)) r
    WHERE r.t IS NULL OR r.mid IS NOT NULL OR NOT EXISTS (SELECT 1 FROM messages x WHERE x.system_number=r.sn AND x.peer_number=r.p AND x.occurred_at BETWEEN r.t-${WINDOW} AND r.t+${WINDOW} AND x.direction=r.d AND x.body=r.b)
    ON CONFLICT(event_key) DO NOTHING`).bind(now,id,payload),
   env.DB.prepare("INSERT INTO opt_outs (number,source,created_at) SELECT DISTINCT peer_number,'keyword',? FROM messages WHERE import_id=? AND event_key IN (SELECT value FROM json_each(?)) ON CONFLICT(number) DO NOTHING").bind(now,id,JSON.stringify(optouts)),
  ]);
  added = results[0].meta.changes;
 }
 const duplicates = valid.length - added;
 await env.DB.prepare('UPDATE imports SET added=added+?,duplicates=duplicates+?,invalid=invalid+? WHERE id=?').bind(added,duplicates,invalid.length,id).run();
 return json({added,duplicates,invalid});
}

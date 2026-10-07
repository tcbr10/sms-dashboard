import {Env,HttpError,json,readBody,recipient} from '../../../shared/validation';
import {loadSettings} from '../../../shared/settings';
import {User,audit} from './users';
// Contact edits from the messages table, by admins and by users allowed to edit contacts. Only the changed fields are sent,
// so two people editing different fields of one contact don't overwrite each other; an empty value removes the field.
export async function saveContact(request: Request, env: Env, user: User): Promise<Response> {
 const admin = user.role === 'admin'; if (!admin && !user.can_edit_contacts) throw new HttpError(403,'You may not edit contact details');
 const body = await readBody(request); const number = recipient(body.number); const fields = (await loadSettings(env.DB)).contact_fields;
 if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new HttpError(400,'Invalid contact data');
 const patch: Record<string,string|null> = {};
 for (const [id,v] of Object.entries(body.data as Record<string,unknown>)) { const f = fields.find(x => x.id === id); if (!f) throw new HttpError(400,'Unknown contact field');
  if (v !== null && typeof v !== 'string') throw new HttpError(400,'Invalid value for '+f.label); const t = (v ?? '').trim(); if (t.length > 200) throw new HttpError(400,f.label+' is too long'); patch[id] = t || null; }
 if (!Object.keys(patch).length) throw new HttpError(400,'Nothing to update');
 // Users may only edit customers who wrote to or were sent from one of their active numbers.
 if (!admin && !await env.DB.prepare('SELECT 1 FROM messages m JOIN user_numbers u ON u.system_number=m.system_number JOIN system_numbers sn ON sn.number=m.system_number WHERE u.email=? AND sn.active=1 AND m.peer_number=? LIMIT 1').bind(user.email,number).first()) throw new HttpError(403,'This number is not in your messages');
 const changes = JSON.stringify(patch);
 await env.DB.batch([
  env.DB.prepare("INSERT INTO contacts (number,data,updated_at,updated_by) VALUES (?,json_patch('{}',?),?,?) ON CONFLICT(number) DO UPDATE SET data=json_patch(contacts.data,?),updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(number,changes,Date.now(),user.email,changes),
  env.DB.prepare("DELETE FROM contacts WHERE number=? AND data='{}'").bind(number),
  audit(env,user.email,'contact.save',number,{fields:Object.keys(patch)}),
 ]);
 const row = await env.DB.prepare('SELECT data FROM contacts WHERE number=?').bind(number).first<{data:string}>();
 return json({ok:true,number,data:row ? JSON.parse(row.data) : null});
}

import {Env,HttpError,json,readBody,recipient,text} from '../../../shared/validation';
import {User,audit} from './users';
type List = {id:number;owner:string;name:string;shared:number};
const MAX_MEMBERS = 10000;
// Users see their own lists and every shared list. Users edit only their own private lists; admins edit their own
// lists and every shared list, and only admins can share a list.
const visible = (l: List, user: User) => l.owner === user.email || !!l.shared;
const editable = (l: List, user: User) => user.role === 'admin' ? l.owner === user.email || !!l.shared : l.owner === user.email && !l.shared;
async function find(env: Env, id: unknown): Promise<List> { if (!Number.isSafeInteger(id)) throw new HttpError(400,'Invalid list'); const l = await env.DB.prepare('SELECT id,owner,name,shared FROM lists WHERE id=?').bind(id).first<List>(); if (!l) throw new HttpError(404,'List not found'); return l; }
export async function lists(request: Request, url: URL, env: Env, user: User): Promise<Response> {
 if (request.method === 'GET') {
  if (url.pathname === '/api/lists') return json({lists:(await env.DB.prepare('SELECT l.id,l.owner,l.name,l.shared,l.updated_at,(SELECT COUNT(*) FROM list_members m WHERE m.list_id=l.id) AS size FROM lists l WHERE l.owner=? OR l.shared=1 ORDER BY l.shared DESC,l.name').bind(user.email).all<List>()).results.map(l => ({...l,editable:editable(l,user)}))});
  if (url.pathname === '/api/lists/members') { const l = await find(env,Number(url.searchParams.get('id'))); if (!visible(l,user)) throw new HttpError(404,'List not found'); return json({...l,editable:editable(l,user),numbers:(await env.DB.prepare('SELECT number FROM list_members WHERE list_id=? ORDER BY number').bind(l.id).all<{number:string}>()).results.map(r => r.number)}); }
  throw new HttpError(404,'Not found');
 }
 const body = await readBody(request, 262144);
 if (url.pathname === '/api/lists/save') {
  const name = text(typeof body.name === 'string' ? body.name.trim() : body.name,'list name',60); const shared = body.shared === true;
  if (shared && user.role !== 'admin') throw new HttpError(403,'Only admins can share lists');
  if (!Array.isArray(body.numbers) || body.numbers.length > MAX_MEMBERS) throw new HttpError(400,'A list holds up to '+MAX_MEMBERS+' numbers');
  const numbers = new Set<string>(); let invalid = 0; for (const n of body.numbers) { try { numbers.add(recipient(n)); } catch { invalid++; } }
  const now = Date.now(); let id: number;
  if (body.id === undefined || body.id === null) {
   if (((await env.DB.prepare('SELECT COUNT(*) AS n FROM lists WHERE owner=?').bind(user.email).first<{n:number}>())?.n ?? 0) >= 200) throw new HttpError(400,'You already have 200 lists');
   id = (await env.DB.prepare('INSERT INTO lists (owner,name,shared,created_at,updated_at) VALUES (?,?,?,?,?) RETURNING id').bind(user.email,name,shared?1:0,now,now).first<{id:number}>())!.id;
  } else { const l = await find(env,body.id); if (!editable(l,user)) throw new HttpError(403,'You cannot edit this list'); id = l.id; }
  await env.DB.batch([
   env.DB.prepare('UPDATE lists SET name=?,shared=?,updated_at=? WHERE id=?').bind(name,shared?1:0,now,id),
   env.DB.prepare('DELETE FROM list_members WHERE list_id=?').bind(id),
   env.DB.prepare('INSERT INTO list_members (list_id,number) SELECT ?,value FROM json_each(?)').bind(id,JSON.stringify([...numbers])),
   audit(env,user.email,'list.save',name,{id,size:numbers.size,shared}),
  ]);
  return json({id,size:numbers.size,invalid});
 }
 if (url.pathname === '/api/lists/delete') {
  const l = await find(env,body.id); if (!editable(l,user)) throw new HttpError(403,'You cannot delete this list');
  await env.DB.batch([env.DB.prepare('DELETE FROM list_members WHERE list_id=?').bind(l.id),env.DB.prepare('DELETE FROM lists WHERE id=?').bind(l.id),audit(env,user.email,'list.delete',l.name,{id:l.id})]);
  return json({ok:true});
 }
 throw new HttpError(404,'Not found');
}

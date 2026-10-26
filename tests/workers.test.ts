import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import ingestion,{ingest} from '../workers/ingest/src/index';
import {runDue,MAX_ATTEMPTS} from '../shared/forwarding';
import {runScheduled} from '../shared/scheduled';
import dashboard,{handle} from '../workers/dashboard/src/index';
import {data} from '../workers/dashboard/src/data';
import {chats} from '../workers/dashboard/src/chats';
import {User} from '../workers/dashboard/src/users';
import {Env,encodeCursor,failure,parseRecipient} from '../shared/validation';
import {PHONE_JS} from '../workers/dashboard/src/ui';
import {micropaySubmission} from '../shared/micropay-submission';
import {redirect} from '../workers/links/src/index';
import {LINKS_JS,findLinks} from '../shared/links';
let mf:Miniflare;let env:Env;
const number='+972501234567',other='+972501234568',peer='+972509876543',token='a'.repeat(40),outToken='b'.repeat(40),message='שלום 👋\n& + "בדיקה" %20';
beforeAll(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-08-06',d1Databases:{DB:'sms-test'}});const bindings=await mf.getBindings();env={DB:bindings.DB as D1Database,INCOMING_TOKEN:token,OUTGOING_TOKEN:outToken};const dir=new URL('../migrations/',import.meta.url);for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile(new URL(file,dir),'utf8')).split(';').filter(s=>s.trim()))await env.DB.prepare(sql).run();});
afterAll(async()=>{await mf?.dispose();});
beforeEach(async()=>{await env.DB.batch([...['messages','user_numbers','sends','opt_outs','audit_log','settings','list_members','lists','contacts','users','imports','forward_rules','deliveries','flows','conversations','bot_answers','bot_blocks','scheduled_sends','links','bot_threads','sender_users','senders','optout_codes','link_groups','short_links','short_link_days','flow_customers','system_numbers'].map(t=>env.DB.prepare('DELETE FROM '+t)),env.DB.prepare('INSERT INTO system_numbers (number,label,active) VALUES (?, ?, 1), (?, ?, 1)').bind(number,'Office',other,'Sales'),env.DB.prepare("INSERT INTO users (email,role,created_at) VALUES ('alice@example.com','user',1),('bob@example.com','user',1),('shared@example.com','user',1),('admin@example.com','admin',1)"),env.DB.prepare('INSERT INTO user_numbers (email,system_number) VALUES (?, ?), (?, ?), (?, ?), (?, ?)').bind('alice@example.com',number,'alice@example.com',other,'bob@example.com',other,'shared@example.com',number)]);});
const user=(email:string,role:'admin'|'user'='user'):User=>({email,name:'',role,can_bulk_send:0,daily_limit:null,density:null,columns:null,test_number:null,sessions_revoked_at:null,can_edit_contacts:1});
const ctx={waitUntil(){},passThroughOnException(){}} as unknown as ExecutionContext;
function send(body:Record<string,unknown>,out=false,secret=out?outToken:token){return ingestion.fetch(new Request('https://ingest.test'+(out?'/events/outgoing':'/hooks/incoming'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify({event_id:'event-1',system_number:number,peer_number:peer,body:message,...body})}),env);}
async function read(email:string,query=''){const r=await data(new URL('https://dashboard.test/api/messages'+query),env,user(email));return r.json() as Promise<{messages:Record<string,unknown>[]}>;}
function callback(format='json',patch:Record<string,string>={},query='',auth=true){const payload={origsms:message,phone:'972509876543',dest:'0501234567',msgid:'00705d38b642d5423',cid:'12762',code:'שלום',sms:'not the full message',net:'97250',...patch};const headers:Record<string,string>=auth?{Authorization:'Bearer '+token}:{};if(format==='get')return new Request('https://ingest.test/hooks/micropay/incoming?'+new URLSearchParams(payload)+query,{headers});headers['Content-Type']=format==='json'?'application/json':'application/x-www-form-urlencoded';return new Request('https://ingest.test/hooks/micropay/incoming'+(query?'?'+query.replace(/^&/,''):''),{method:'POST',headers,body:format==='json'?JSON.stringify(payload):new URLSearchParams(payload).toString()});}
describe('normalized ingestion',()=>{
 it('preserves Unicode and stable-ID deduplication',async()=>{expect((await send({})).status).toBe(200);await send({});await send({event_id:'event-2'});const rows=await read('alice@example.com');expect(rows.messages).toHaveLength(2);expect(rows.messages[0].body).toBe(message);});
 it('keeps unidentified legitimate repeats',async()=>{await send({event_id:undefined});await send({event_id:undefined});expect((await read('alice@example.com')).messages).toHaveLength(2);});
 it('rejects invalid credentials, unknown and inactive numbers',async()=>{expect((await send({},false,'bad')).status).toBe(401);expect((await send({system_number:'+972501234569'})).status).toBe(403);expect((await send({},true,token)).status).toBe(401);expect((await ingestion.fetch(new Request('https://ingest.test/hooks/incoming?token='+token,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env)).status).toBe(401);for(const INCOMING_TOKEN of [undefined,'short'])expect((await ingestion.fetch(new Request('https://ingest.test/hooks/incoming',{method:'POST',headers:{Authorization:'Bearer '+token}}),{...env,INCOMING_TOKEN})).status).toBe(503);await env.DB.prepare('UPDATE system_numbers SET active=0 WHERE number=?').bind(number).run();expect((await send({})).status).toBe(403);});
 it('rejects malformed/oversized messages and conflicting IDs',async()=>{expect((await send({body:''})).status).toBe(400);expect((await send({body:'x'.repeat(33000)})).status).toBe(413);await send({});expect((await send({body:'different'})).status).toBe(409);});
 it('updates older outbound messages without regressing finalized states',async()=>{await send({submission_status:'pending',occurred_at:'2020-01-01T00:00:00Z'},true);const before=await env.DB.prepare('SELECT updated_at,id FROM messages').first<{updated_at:number;id:number}>();await send({submission_status:'accepted'},true);await send({submission_status:'pending'},true);const rows=await read('alice@example.com','?since='+encodeCursor({t:before!.updated_at,id:before!.id}));expect(rows.messages).toHaveLength(1);expect(rows.messages[0].submission_status).toBe('accepted');expect(rows.messages[0].occurred_at).toBe(Date.parse('2020-01-01T00:00:00Z'));expect((await send({submission_status:'rejected'},true)).status).toBe(409);expect((await send({event_id:undefined,submission_status:'pending'},true)).status).toBe(400);});
});
describe('documented Micropay callbacks',()=>{
 it.each(['get','form','json'])('supports %s and returns a no-reply acknowledgement',async format=>{const r=await ingestion.fetch(callback(format),env);expect(r.status).toBe(200);expect(await r.text()).toBe(format==='json'?'{"reply":""}':'OK');expect(r.headers.get('Cache-Control')).toBe('no-store');const rows=await read('alice@example.com');expect(rows.messages[0]).toMatchObject({body:message,system_number:number,peer_number:peer,time_source:'receipt'});});
 it('deduplicates across transport formats by msgid',async()=>{for(const f of ['get','form','json'])await ingestion.fetch(callback(f),env);expect((await read('alice@example.com')).messages).toHaveLength(1);await ingestion.fetch(callback('json',{msgid:'new-id'}),env);expect((await read('alice@example.com')).messages).toHaveLength(2);});
 it('does not decode JSON text again or reconstruct origsms from sms',async()=>{await ingestion.fetch(callback('json',{origsms:'literal %2B + &',sms:'other'}),env);expect((await read('alice@example.com')).messages[0].body).toBe('literal %2B + &');expect((await ingestion.fetch(callback('json',{origsms:''}),env)).status).toBe(400);});
 it('requires stable IDs and rejects duplicates or mixed POST fields',async()=>{expect((await ingestion.fetch(callback('json',{msgid:''}),env)).status).toBe(400);expect((await ingestion.fetch(callback('get',{},'&msgid=duplicate'),env)).status).toBe(400);expect((await ingestion.fetch(callback('form',{},'&dest=0501234567'),env)).status).toBe(400);expect((await ingestion.fetch(callback('json',{body:'normalized'}),env)).status).toBe(400);});
 it('accepts the incoming token in the URL and rejects the outgoing token',async()=>{expect((await ingestion.fetch(callback('get',{},'',false),env)).status).toBe(401);for(const f of ['get','form','json'])expect((await ingestion.fetch(callback(f,{msgid:f},'&token='+token,false),env)).status).toBe(200);expect((await ingestion.fetch(callback('get',{},'&token='+outToken,false),env)).status).toBe(401);});
 it('requires dest to be a registered system number',async()=>{expect((await ingestion.fetch(callback('json',{dest:'0501234569'}),env)).status).toBe(403);const p={origsms:message,phone:'0509876543',msgid:'missing-dest'};expect((await ingestion.fetch(new Request('https://ingest.test/hooks/micropay/incoming',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(p)}),env)).status).toBe(400);expect((await ingestion.fetch(callback('json',{dest:'0501234568'}),env)).status).toBe(200);expect((await read('bob@example.com')).messages.map(m=>m.system_number)).toEqual([other]);});
 it('never returns success when storage fails',async()=>{const broken={...env,DB:{prepare(){throw new Error('storage unavailable');}} as unknown as D1Database};expect((await ingestion.fetch(callback(),broken)).status).toBe(503);expect((await ingestion.fetch(new Request('https://ingest.test/hooks/incoming',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({system_number:number,peer_number:peer,body:message})}),broken)).status).toBe(503);});
});
describe('Micropay automation JSON templates',()=>{
 const post=(raw:string)=>ingestion.fetch(new Request('https://ingest.test/hooks/micropay/incoming',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:raw}),env);
 const tpl=(origsms:string,msgid:string,order:'normal'|'body-last'='normal')=>order==='normal'?'{"origsms":"'+origsms+'","phone":"0509876543","dest":"0501234567","msgid":"'+msgid+'"}':'{\n  "msgid": "'+msgid+'",\n  "phone": "0509876543",\n  "dest": "0501234567",\n  "origsms": "'+origsms+'"\n}';
 const bodies=async()=>(await read('alice@example.com')).messages.map(m=>m.body).reverse();
 it('accepts messages pasted in unescaped, with line breaks, tabs or quotes',async()=>{
  expect((await post(tpl('316233436\nמצפה רמון\nמצפה רמון','a1'))).status).toBe(200);
  expect((await post(tpl('שורה\r\nשנייה\tטאב','a2','body-last'))).status).toBe(200);
  expect((await post(tpl('הוא אמר "כן", ואז הלך\nלבית','a3'))).status).toBe(200);
  expect((await post(tpl('escaped \\"ok\\" \\n stays','a4'))).status).toBe(200);
  expect(await bodies()).toEqual(['316233436\nמצפה רמון\nמצפה רמון','שורה\r\nשנייה\tטאב','הוא אמר "כן", ואז הלך\nלבית','escaped "ok" \n stays']);});
 it('still refuses what is not a Micropay object',async()=>{expect((await post('not json')).status).toBe(400);expect((await post('{"origsms":"x"')).status).toBe(400);expect((await post('{"phone":"1","phone":"2"}')).status).toBe(400);
  expect((await post('{"origsms":"a\nb","phone":"0509876543","dest":"0501234567"}')).status).toBe(400);});
});
describe('authorization',()=>{
 beforeEach(async()=>{await send({});await env.DB.prepare('INSERT INTO messages(event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('other','in',other,peer,'sales',1,1,'receipt',1).run();});
 it('supports multiple assignments, shared numbers and empty users',async()=>{expect((await read('alice@example.com')).messages).toHaveLength(2);expect((await read('bob@example.com')).messages.map(m=>m.system_number)).toEqual([other]);expect((await read('shared@example.com')).messages.map(m=>m.system_number)).toEqual([number]);expect((await read('none@example.com')).messages).toHaveLength(0);});
 it('preserves isolation across number, peer, search and cursors',async()=>{await expect(read('bob@example.com','?system_number='+encodeURIComponent(number))).rejects.toMatchObject({status:403});expect((await read('bob@example.com','?peer_number='+encodeURIComponent(peer)+'&q=שלום')).messages).toHaveLength(0);for(const q of ['?cursor='+encodeCursor({t:Date.now(),id:999}),'?since='+encodeCursor({t:0,id:0})])expect((await read('bob@example.com',q)).messages.map(m=>m.system_number)).toEqual([other]);});
 it('does not trust email headers without a verified Access JWT',async()=>{const r=await dashboard.fetch(new Request('https://dashboard.test/api/messages',{headers:{'Cf-Access-Authenticated-User-Email':'alice@example.com'}}),{...env,ACCESS_ISSUER:'https://test.cloudflareaccess.com',ACCESS_AUD:'aud'},ctx);expect(r.status).toBe(401);expect(r.headers.get('Cache-Control')).toBe('no-store');});
});
describe('table queries',()=>{
 const third='+972509876544',day=(d:number)=>Date.parse('2026-01-0'+d+'T00:00:00Z');
 beforeEach(async()=>{await send({event_id:'a',peer_number:third,occurred_at:'2026-01-01T00:00:00Z'});await send({event_id:'b',occurred_at:'2026-01-02T00:00:00Z'});await send({event_id:'c',occurred_at:'2026-01-03T00:00:00Z',submission_status:'rejected'},true);await send({event_id:'d',peer_number:third,occurred_at:'2026-01-04T00:00:00Z',submission_status:'accepted'},true);});
 async function pages(query:string){const seen:number[]=[];let cursor='';for(let i=0;i<10;i++){const r=await (await data(new URL('https://dashboard.test/api/messages?limit=1&'+query+cursor),env,user('alice@example.com'))).json() as {messages:{occurred_at:number}[];next_cursor:string|null};seen.push(...r.messages.map(m=>m.occurred_at));if(!r.next_cursor)break;cursor='&cursor='+r.next_cursor;}return seen;}
 async function stats(email:string,query=''){return (await data(new URL('https://dashboard.test/api/stats'+query),env,user(email))).json();}
 it('sorts by every column and pages with keyset cursors',async()=>{expect(await pages('')).toEqual([day(4),day(3),day(2),day(1)]);expect(await pages('sort=time&order=asc')).toEqual([day(1),day(2),day(3),day(4)]);expect(await pages('sort=peer&order=asc')).toEqual([day(2),day(3),day(1),day(4)]);expect(await pages('sort=peer&order=desc')).toEqual([day(4),day(1),day(3),day(2)]);expect(await pages('sort=status&order=asc')).toEqual([day(1),day(2),day(4),day(3)]);expect(await pages('sort=direction&order=desc')).toEqual([day(4),day(3),day(2),day(1)]);expect(await pages('sort=number&order=asc')).toEqual([day(1),day(2),day(3),day(4)]);});
 it('filters by direction and status and summarizes the same filter',async()=>{expect((await read('alice@example.com','?direction=out')).messages.map(m=>m.occurred_at)).toEqual([day(4),day(3)]);expect((await read('alice@example.com','?status=rejected')).messages.map(m=>m.occurred_at)).toEqual([day(3)]);expect(await stats('alice@example.com')).toMatchObject({total:4,incoming:2,outgoing:2,peers:2});expect(await stats('alice@example.com','?direction=in&peer_number='+encodeURIComponent(third))).toMatchObject({total:1,incoming:1,outgoing:0,peers:1});expect(await stats('bob@example.com')).toEqual({total:0,incoming:0,outgoing:0,peers:0,max_id:0});expect(await (await handle(new Request('https://dashboard.test/api/me'),env,'alice@example.com')).json()).toMatchObject({email:'alice@example.com',role:'user',numbers:[{number,can_send:0},{number:other,can_send:0}]});});
 it('rejects unknown sorts, filters and mismatched cursors',async()=>{for(const q of ['?sort=body','?order=up','?direction=both','?status=delivered','?sort=peer&cursor='+encodeCursor({t:5,id:1}),'?cursor='+encodeCursor({t:'+972509876543',id:1})])await expect(read('alice@example.com',q)).rejects.toMatchObject({status:400});await expect(stats('bob@example.com','?system_number='+encodeURIComponent(number))).rejects.toMatchObject({status:403});});
});
const ORIGIN='https://dashboard.test';
async function api(email:string,path:string,body?:unknown,headers:Record<string,string>={Origin:ORIGIN}){try{return await handle(new Request(ORIGIN+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}),env,email);}catch(e){return failure(e);}}
async function body(r:Response|Promise<Response>){return (await (await r).json()) as Record<string,unknown>;}
async function audits(){return (await env.DB.prepare('SELECT action FROM audit_log ORDER BY id').all<{action:string}>()).results.map(r=>r.action);}
describe('access and administration',()=>{
 it('admits only active users and blocks cross-site writes',async()=>{expect((await api('stranger@example.com','/api/me')).status).toBe(403);const page=await api('stranger@example.com','/');expect(page.status).toBe(403);expect(await page.text()).toContain('אין לך גישה');
  expect((await api('alice@example.com','/api/me/prefs',{density:'dense'},{})).status).toBe(403);expect((await api('alice@example.com','/api/me/prefs',{density:'dense'},{Origin:'https://evil.example'})).status).toBe(403);
  expect((await api('alice@example.com','/api/me/prefs',{density:'dense'})).status).toBe(200);expect(await (await api('alice@example.com','/api/me')).json()).toMatchObject({density:'dense'});
  await env.DB.prepare("UPDATE users SET active=0 WHERE email='alice@example.com'").run();expect((await api('alice@example.com','/api/me')).status).toBe(403);});
 it('keeps admin tools for admins, who see every active number',async()=>{expect((await api('alice@example.com','/api/admin/users')).status).toBe(403);expect((await api('alice@example.com','/admin')).status).toBe(302);expect((await api('admin@example.com','/admin')).status).toBe(200);
  await send({});await send({event_id:'sales',system_number:other});expect((await body(api('admin@example.com','/api/messages'))).messages).toHaveLength(2);
  expect(await (await api('admin@example.com','/api/me')).json()).toMatchObject({role:'admin',daily_limit:null,can_bulk_send:true,numbers:[{number,can_send:1},{number:other,can_send:1}]});});
 it('creates, updates and deletes users with per-number permissions',async()=>{const save=(body:Record<string,unknown>)=>api('admin@example.com','/api/admin/users/save',{create:false,name:'',role:'user',active:true,can_bulk_send:false,daily_limit:null,numbers:[],...body});
  expect((await save({create:true,email:' New@Example.com',name:'דנה',numbers:[{number,can_send:true}]})).status).toBe(200);expect(await (await api('new@example.com','/api/me')).json()).toMatchObject({name:'דנה',numbers:[{number,can_send:1}]});
  expect((await save({create:true,email:'new@example.com'})).status).toBe(409);expect((await save({email:'new@example.com',numbers:[{number:'+972501234599',can_send:false}]})).status).toBe(400);expect((await save({email:'missing@example.com'})).status).toBe(404);
  expect((await save({email:'new@example.com',daily_limit:50})).status).toBe(200);expect(await (await api('new@example.com','/api/me')).json()).toMatchObject({numbers:[],daily_limit:50});
  expect((await api('admin@example.com','/api/admin/users/delete',{email:'new@example.com'})).status).toBe(200);expect((await api('new@example.com','/api/me')).status).toBe(403);
  expect(await audits()).toEqual(['user.create','user.update','user.delete']);});
 it('never leaves the system without an active admin',async()=>{const base={create:false,name:'',active:true,can_bulk_send:false,daily_limit:null,numbers:[]};
  expect((await api('admin@example.com','/api/admin/users/save',{...base,email:'admin@example.com',role:'user'})).status).toBe(400);expect((await api('admin@example.com','/api/admin/users/delete',{email:'admin@example.com'})).status).toBe(400);
  expect((await api('admin@example.com','/api/admin/users/save',{...base,create:true,email:'boss@example.com',role:'admin'})).status).toBe(200);
  expect((await api('boss@example.com','/api/admin/users/save',{...base,email:'admin@example.com',role:'user'})).status).toBe(200);expect((await api('admin@example.com','/api/admin/users')).status).toBe(403);
  expect((await api('boss@example.com','/api/admin/users/save',{...base,email:'boss@example.com',role:'admin',active:false})).status).toBe(400);});
 it('validates and stores settings',async()=>{expect((await api('admin@example.com','/api/admin/settings',{refresh_seconds:1})).status).toBe(400);expect((await api('admin@example.com','/api/admin/settings',{allow_international:'yes'})).status).toBe(400);
  expect((await api('admin@example.com','/api/admin/settings',{org_name:' Acme ',max_recipients:2})).status).toBe(200);expect(await (await api('admin@example.com','/api/admin/settings')).json()).toMatchObject({org_name:'Acme',max_recipients:2,refresh_seconds:5});
  expect(await (await api('alice@example.com','/api/me')).json()).toMatchObject({settings:{org_name:'Acme',max_recipients:2}});expect(await audits()).toEqual(['settings.update']);});
 it('manages numbers and the opt-out list',async()=>{expect((await api('admin@example.com','/api/admin/numbers/save',{create:true,number:'050-123-4569',label:'New',active:true})).status).toBe(200);expect((await api('admin@example.com','/api/admin/numbers/save',{create:true,number:'+972501234569',label:'Again',active:true})).status).toBe(409);
  expect((await api('admin@example.com','/api/admin/numbers/save',{number:'+972501234569',label:'Old',active:false})).status).toBe(200);expect((await body(api('admin@example.com','/api/admin/numbers'))).numbers).toContainEqual({number:'+972501234569',label:'Old',active:0,bot_reply:'response',users:0});
  expect(await (await api('admin@example.com','/api/admin/optouts/add',{numbers:['050-987-6543','nope']})).json()).toEqual({added:1,invalid:1});expect((await body(api('admin@example.com','/api/admin/optouts'))).optouts).toMatchObject([{number:peer,source:'manual',created_by:'admin@example.com'}]);
  expect((await api('admin@example.com','/api/admin/optouts/remove',{number:peer})).status).toBe(200);expect((await body(api('admin@example.com','/api/admin/optouts'))).optouts).toEqual([]);});
});
describe('sending',()=>{
 const third='+972509876544',fourth='+972509876545';
 function provider(reply:string|Error='OK 34556'){const calls:Record<string,string>[]=[];return {calls,fetcher:async(_url:string,init:RequestInit)=>{calls.push(JSON.parse(String(init.body)));if(reply instanceof Error)throw reply;return new Response(reply);}};}
 async function sendAs(email:string,body:Record<string,unknown>={},p=provider(),token:string|null='secret'){try{return await handle(new Request(ORIGIN+'/api/send',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),system_number:number,recipients:[peer],body:'שלום',...body})}),{...env,MICROPAY_TOKEN:token??undefined},email,{fetcher:p.fetcher});}catch(e){return failure(e);}}
 beforeEach(async()=>{await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com' AND system_number=?").bind(number).run();});
 it('sends from a permitted number once per send ID and logs each recipient',async()=>{const p=provider();const id=crypto.randomUUID();const r=await sendAs('alice@example.com',{id},p);
  expect(await r.json()).toMatchObject({id,status:'accepted',sent:1,task_id:'34556'});expect(p.calls).toEqual([expect.objectContaining({token:'secret',from:'0501234567',list:'0509876543',msg:'שלום'})]);
  expect((await read('alice@example.com','?direction=out')).messages).toMatchObject([{peer_number:peer,body:'שלום',submission_status:'accepted',sent_by:'alice@example.com'}]);
  expect(await (await sendAs('alice@example.com',{id},p)).json()).toMatchObject({duplicate:true,status:'accepted'});expect(p.calls).toHaveLength(1);expect((await sendAs('bob@example.com',{id})).status).toBe(409);expect(await audits()).toEqual(['send']);});
 it('enforces number, bulk, recipient and daily limits and skips opted-out numbers',async()=>{expect((await sendAs('bob@example.com',{system_number:other})).status).toBe(403);expect((await sendAs('alice@example.com',{system_number:other})).status).toBe(403);
  expect((await sendAs('alice@example.com',{recipients:[peer,third]})).status).toBe(403);
  await env.DB.batch([env.DB.prepare("UPDATE users SET can_bulk_send=1,daily_limit=3 WHERE email='alice@example.com'"),env.DB.prepare("INSERT INTO opt_outs VALUES (?,'manual',1,NULL)").bind(third),env.DB.prepare("INSERT INTO settings VALUES ('optout_text','\"להסרה השיבו הסר\"')")]);
  const p=provider();expect(await (await sendAs('alice@example.com',{recipients:[peer,third,'972509876545','nope','050-987-6543']},p)).json()).toMatchObject({status:'accepted',sent:2,skipped:{invalid:1,duplicates:1,opted_out:1}});
  expect(p.calls[0]).toMatchObject({list:'0509876543,0509876545',msg:'שלום\r\nלהסרה השיבו הסר'});expect((await read('alice@example.com','?direction=out')).messages.map(m=>m.peer_number).sort()).toEqual([peer,fourth]);
  const limited=await sendAs('alice@example.com',{recipients:[peer,fourth]});expect(limited.status).toBe(429);expect(await limited.json()).toMatchObject({error:expect.stringContaining('2 of 3')});
  await env.DB.prepare("INSERT INTO settings VALUES ('max_recipients','1')").run();expect((await sendAs('admin@example.com',{recipients:[peer,fourth]})).status).toBe(413);});
 it('records provider rejections and unknown results and never retries them',async()=>{expect(await (await sendAs('alice@example.com',{},provider('ERROR --> Description: invalid token'))).json()).toMatchObject({status:'rejected',error:expect.stringContaining('invalid token')});
  const p=provider(new Error('timeout'));expect(await (await sendAs('alice@example.com',{recipients:['0509876544']},p)).json()).toMatchObject({status:'unknown'});expect(p.calls).toHaveLength(1);
  expect((await read('alice@example.com','?direction=out')).messages.map(m=>m.submission_status).sort()).toEqual(['rejected','unknown']);expect((await sendAs('alice@example.com',{},provider(),null)).status).toBe(503);});
 it('adds customers who reply with an opt-out word to the opt-out list',async()=>{await send({event_id:'stop',body:' הסר! '});await send({event_id:'hello',peer_number:third,body:'הסר אותי מחר בבקשה'});
  expect((await env.DB.prepare('SELECT number,source FROM opt_outs').all()).results).toEqual([{number:peer,source:'keyword'}]);});
});
describe('columns, contacts, export, disconnect, test sends and lists',()=>{
 const third='+972509876544';
 it('saves visible columns and a test number per user and validates contact fields',async()=>{expect((await api('alice@example.com','/api/me/prefs',{columns:['time','c:name','body']})).status).toBe(200);expect((await api('alice@example.com','/api/me/prefs',{columns:['time;drop']})).status).toBe(400);
  expect((await api('alice@example.com','/api/me/prefs',{test_number:'050-987-6543'})).status).toBe(200);
  expect(await body(api('alice@example.com','/api/me'))).toMatchObject({columns:['time','c:name','body'],test_number:peer,contact_fields:[{id:'name'},{id:'id_number'}]});
  expect((await api('admin@example.com','/api/admin/settings',{contact_fields:[{id:'Bad Id',label:'x'}]})).status).toBe(400);expect((await api('admin@example.com','/api/admin/settings',{contact_fields:[{id:'city',label:'עיר'}]})).status).toBe(200);
  expect(await body(api('alice@example.com','/api/me'))).toMatchObject({contact_fields:[{id:'city',label:'עיר'}]});});
 it('filters by several values per column and by contained text',async()=>{await send({event_id:'a',body:'שלום עולם'});await send({event_id:'b',peer_number:third,body:'מחיר?'});await send({event_id:'c',system_number:other,body:'sales'});await send({event_id:'d',submission_status:'rejected',body:'reply'},true);await send({event_id:'e',submission_status:'accepted',body:'ok',peer_number:third},true);
  const bodies=async(q:string)=>((await body(api('admin@example.com','/api/messages'+q))).messages as {body:string}[]).map(m=>m.body).sort();
  expect(await bodies('?status=rejected,accepted')).toEqual(['ok','reply']);expect(await bodies('?system_number='+encodeURIComponent(number+','+other)+'&direction=in')).toEqual(['sales','מחיר?','שלום עולם'].sort());
  expect(await bodies('?peer_q=050-987-6544')).toEqual(['ok','מחיר?'].sort());expect(await bodies('?body_q=עולם')).toEqual(['שלום עולם']);
  expect((await api('alice@example.com','/api/messages?system_number='+encodeURIComponent(number+',+972501234599'))).status).toBe(403);});
 it('joins contact data for display, search, filters, sorting and logs exports',async()=>{await api('admin@example.com','/api/admin/contacts/save',{number:'050-987-6543',data:{name:'דנה',id_number:'123',ignored:'x'}});await api('admin@example.com','/api/admin/contacts/save',{number:third,data:{name:'אבי'}});
  await send({event_id:'a'});await send({event_id:'b',peer_number:third});await send({event_id:'c',peer_number:'+972509876545'});
  expect(((await body(api('alice@example.com','/api/messages?sort=c:name&order=asc'))).messages as {contact:unknown}[]).map(m=>m.contact)).toEqual([null,{name:'אבי'},{name:'דנה',id_number:'123'}]);
  const p1=await body(api('alice@example.com','/api/messages?sort=c:name&order=desc&limit=1'));expect(p1.messages).toMatchObject([{contact:{name:'דנה'}}]);expect(await body(api('alice@example.com','/api/messages?sort=c:name&order=desc&limit=1&cursor='+p1.next_cursor))).toMatchObject({messages:[{contact:{name:'אבי'}}]});
  expect((await body(api('alice@example.com','/api/messages?q=דנה'))).messages).toHaveLength(1);expect((await body(api('alice@example.com','/api/messages?cf_name=אב'))).messages).toHaveLength(1);
  expect((await api('alice@example.com','/api/messages?sort=c:nope')).status).toBe(400);expect((await api('alice@example.com','/api/messages?limit=500')).status).toBe(400);
  const first=await body(api('alice@example.com','/api/messages?limit=2&export=1&columns=time,c:name&format=csv'));expect(first.messages).toHaveLength(2);
  expect((await api('alice@example.com','/api/messages?limit=2&export=1&cursor='+first.next_cursor)).status).toBe(200);expect(await audits()).toEqual(['contact.save','contact.save','export']);});
 it('imports contacts, merging or skipping existing ones',async()=>{await api('admin@example.com','/api/admin/contacts/save',{number:peer,data:{name:'דנה',id_number:'1'}});
  expect(await body(api('admin@example.com','/api/admin/contacts/import',{mode:'skip',rows:[{number:'0509876543',data:{name:'X'}},{number:'972509876544',data:{name:'אבי'}},{number:'bad',data:{}}]}))).toEqual({imported:1,invalid:1});
  expect(await body(api('admin@example.com','/api/admin/contacts/import',{mode:'update',rows:[{number:peer,data:{id_number:'2'}}]}))).toEqual({imported:1,invalid:0});
  expect((await body(api('admin@example.com','/api/admin/contacts'))).contacts).toEqual(expect.arrayContaining([expect.objectContaining({number:peer,data:{name:'דנה',id_number:'2'}}),expect.objectContaining({number:third,data:{name:'אבי'}})]));
  expect((await api('alice@example.com','/api/admin/contacts')).status).toBe(403);expect((await api('admin@example.com','/api/admin/contacts/delete',{number:peer})).status).toBe(200);expect((await body(api('admin@example.com','/api/admin/contacts'))).total).toBe(1);});
 it('ends a user session on disconnect and can also disable them',async()=>{const old={email:'alice@example.com',iat:Math.floor(Date.now()/1000)-60};expect((await handle(new Request(ORIGIN+'/api/me'),env,old)).status).toBe(200);
  expect((await api('admin@example.com','/api/admin/users/disconnect',{email:'admin@example.com'})).status).toBe(400);expect((await api('admin@example.com','/api/admin/users/disconnect',{email:'alice@example.com'})).status).toBe(200);
  await expect(handle(new Request(ORIGIN+'/api/me'),env,old)).rejects.toMatchObject({status:401});expect((await handle(new Request(ORIGIN+'/'),env,old)).status).toBe(401);
  expect((await handle(new Request(ORIGIN+'/api/me'),env,{email:'alice@example.com',iat:Math.floor(Date.now()/1000)+1})).status).toBe(200);
  expect((await api('admin@example.com','/api/admin/users/disconnect',{email:'alice@example.com',disable:true})).status).toBe(200);expect((await api('alice@example.com','/api/me')).status).toBe(403);expect(await audits()).toEqual(['user.disconnect','user.disconnect']);});
 it('sends a test to one number with the opt-out text a multi-recipient send would carry',async()=>{await env.DB.batch([env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com' AND system_number=?").bind(number),env.DB.prepare("INSERT INTO settings VALUES ('optout_text','\"להסרה השיבו הסר\"')")]);
  const calls:string[]=[];const fetcher=async(_u:string,init:RequestInit)=>{calls.push(JSON.parse(String(init.body)).msg);return new Response('OK 7');};
  const test=(b:Record<string,unknown>)=>handle(new Request(ORIGIN+'/api/send',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),test:true,system_number:number,body:'שלום',...b})}),{...env,MICROPAY_TOKEN:'t'},'alice@example.com',{fetcher}).catch(failure);
  expect((await test({recipients:[peer,third]})).status).toBe(400);expect(await body(test({recipients:[peer],bulk_preview:true}))).toMatchObject({status:'accepted',sent:1});expect(await body(test({recipients:[peer]}))).toMatchObject({status:'accepted'});
  expect(calls).toEqual(['שלום\r\nלהסרה השיבו הסר','שלום']);expect((await read('alice@example.com','?direction=out')).messages.map(m=>m.is_test)).toEqual([1,1]);});
 it('keeps lists private unless an admin shares them',async()=>{const save=(email:string,b:Record<string,unknown>)=>api(email,'/api/lists/save',{name:'VIP',numbers:[],...b});
  const mine=await body(save('alice@example.com',{numbers:['050-987-6543','0509876543','bad']}));expect(mine).toMatchObject({size:1,invalid:1});expect((await save('alice@example.com',{shared:true})).status).toBe(403);
  const shared=await body(save('admin@example.com',{name:'כולם',shared:true,numbers:[third]}));
  expect(((await body(api('bob@example.com','/api/lists'))).lists as {name:string;editable:boolean}[]).map(l=>[l.name,l.editable])).toEqual([['כולם',false]]);
  expect((await api('bob@example.com','/api/lists/members?id='+mine.id)).status).toBe(404);expect((await body(api('bob@example.com','/api/lists/members?id='+shared.id))).numbers).toEqual([third]);expect((await save('bob@example.com',{id:shared.id})).status).toBe(403);
  expect((await save('alice@example.com',{id:mine.id,name:'VIP 2',numbers:[peer,third]})).status).toBe(200);expect(((await body(api('alice@example.com','/api/lists'))).lists as {name:string;size:number}[]).map(l=>[l.name,l.size])).toEqual([['כולם',1],['VIP 2',2]]);
  expect((await api('bob@example.com','/api/lists/delete',{id:mine.id})).status).toBe(403);expect((await api('alice@example.com','/api/lists/delete',{id:mine.id})).status).toBe(200);});
});
describe('profile sign-out and contact editing by users',()=>{
 const third='+972509876544';
 it('logs a sign-out and requires a same-origin request',async()=>{expect((await api('alice@example.com','/api/me/logout',{},{Origin:'https://evil.test'})).status).toBe(403);expect((await api('alice@example.com','/api/me/logout',{})).status).toBe(200);expect(await audits()).toEqual(['user.logout']);});
 it('lets users edit only changed fields of customers in their messages',async()=>{await send({});await env.DB.prepare('INSERT INTO messages(event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('third','in',other,third,'x',1,1,'receipt',1).run();
  expect(await body(api('alice@example.com','/api/me'))).toMatchObject({can_edit_contacts:true});
  expect(await body(api('alice@example.com','/api/contacts/save',{number:'050-987-6543',data:{name:' דנה '}}))).toEqual({ok:true,number:peer,data:{name:'דנה'}});
  expect(await body(api('shared@example.com','/api/contacts/save',{number:peer,data:{id_number:'123'}}))).toMatchObject({data:{name:'דנה',id_number:'123'}});
  expect(await body(api('alice@example.com','/api/contacts/save',{number:peer,data:{name:''}}))).toMatchObject({data:{id_number:'123'}});
  expect((await api('shared@example.com','/api/contacts/save',{number:third,data:{name:'x'}})).status).toBe(403);expect((await api('bob@example.com','/api/contacts/save',{number:third,data:{name:'אבי'}})).status).toBe(200);
  expect((await api('alice@example.com','/api/contacts/save',{number:peer,data:{unknown:'x'}})).status).toBe(400);expect((await api('alice@example.com','/api/contacts/save',{number:peer,data:{}})).status).toBe(400);expect((await api('alice@example.com','/api/contacts/save',{number:peer,data:{name:'x'.repeat(201)}})).status).toBe(400);
  expect(await body(api('admin@example.com','/api/contacts/save',{number:'0521112222',data:{name:'חדש'}}))).toMatchObject({data:{name:'חדש'}});
  expect(await body(api('bob@example.com','/api/contacts/save',{number:third,data:{name:''}}))).toMatchObject({data:null});expect(await env.DB.prepare('SELECT 1 FROM contacts WHERE number=?').bind(third).first()).toBeNull();
  expect((await audits()).filter(a=>a==='contact.save')).toHaveLength(6);});
 it('lets admins turn contact editing off per user',async()=>{await send({});const save=(flag?:boolean)=>api('admin@example.com','/api/admin/users/save',{email:'alice@example.com',role:'user',active:true,can_bulk_send:false,daily_limit:null,numbers:[{number,can_send:false}],...(flag===undefined?{}:{can_edit_contacts:flag})});
  expect((await save(false)).status).toBe(200);expect(await body(api('alice@example.com','/api/me'))).toMatchObject({can_edit_contacts:false});expect((await api('alice@example.com','/api/contacts/save',{number:peer,data:{name:'x'}})).status).toBe(403);
  expect(((await body(api('admin@example.com','/api/admin/users'))).users as {email:string;can_edit_contacts:number}[]).find(u=>u.email==='alice@example.com')?.can_edit_contacts).toBe(0);
  expect((await save()).status).toBe(200);expect((await api('alice@example.com','/api/contacts/save',{number:peer,data:{name:'x'}})).status).toBe(200);});
});
describe('webhook forwarding',()=>{
 type Call={url:string;init:RequestInit};
 function hook(respond:(c:Call)=>Response|Promise<Response>=()=>new Response('ok')){const calls:Call[]=[];return {calls,fetcher:async(url:string,init:RequestInit)=>{const c={url,init};calls.push(c);return respond(c);}};}
 const rule=(b:Record<string,unknown>={})=>api('admin@example.com','/api/admin/forwards/save',{name:'CRM',system_number:number,senders:[],url:'https://hooks.example.com/sms',format:'json',headers:{'X-Api-Key':'k1'},active:true,...b});
 const incoming=(h:{fetcher:(u:string,i:RequestInit)=>Promise<Response>},patch:Record<string,string>={})=>ingest(callback('json',patch),env,{fetcher:h.fetcher}).catch(failure);
 const deliveries=()=>env.DB.prepare('SELECT status,attempts,last_status,last_error,next_at FROM deliveries ORDER BY id').all<Record<string,unknown>>().then(r=>r.results);
 async function sign(secret:string,body:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return 'sha256='+[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
 it('posts signed JSON for matching incoming messages only, once per message',async()=>{expect((await rule()).status).toBe(200);await rule({name:'VIP only',senders:['0521112222'],url:'https://vip.example.com/x'});
  const h=hook();const r=await incoming(h);expect(r.status).toBe(200);expect(await r.text()).toBe('{"reply":""}');
  expect(h.calls.map(c=>c.url)).toEqual(['https://hooks.example.com/sms']);const c=h.calls[0];const headers=c.init.headers as Record<string,string>;const sent=JSON.parse(String(c.init.body));
  expect(sent).toMatchObject({event:'sms.incoming',msgid:'00705d38b642d5423',system_number:number,system_label:'Office',from:peer,body:message,contact:null});expect(headers['X-Api-Key']).toBe('k1');expect(headers['Content-Type']).toContain('application/json');
  const secret=((await body(api('admin@example.com','/api/admin/forwards'))).rules as {secret:string}[])[0].secret;expect(headers['X-SMS-Signature']).toBe(await sign(secret,String(c.init.body)));
  await incoming(h);expect(h.calls).toHaveLength(1);
  await incoming(h,{msgid:'m2',phone:'0521112222'});expect(h.calls.map(c=>c.url)).toEqual(['https://hooks.example.com/sms','https://hooks.example.com/sms','https://vip.example.com/x']);
  expect(await deliveries()).toEqual([{status:'delivered',attempts:1,last_status:200,last_error:null,next_at:null},{status:'delivered',attempts:1,last_status:200,last_error:null,next_at:null},{status:'delivered',attempts:1,last_status:200,last_error:null,next_at:null}]);});
 it('sends Micropay\'s own format as a form post',async()=>{await rule({format:'micropay'});const h=hook();await incoming(h);const f=new URLSearchParams(String(h.calls[0].init.body));
  expect(Object.fromEntries(f)).toEqual({origsms:message,phone:'0509876543',dest:'0501234567',msgid:'00705d38b642d5423'});expect((h.calls[0].init.headers as Record<string,string>)['Content-Type']).toContain('x-www-form-urlencoded');});
 it('never lets a webhook failure affect receiving, and retries until it gives up',async()=>{await rule();const down=hook(()=>{throw new Error('connection refused');});
  const r=await incoming(down);expect(r.status).toBe(200);expect((await read('alice@example.com')).messages).toHaveLength(1);
  let d=(await deliveries())[0];expect(d).toMatchObject({status:'pending',attempts:1,last_status:null,last_error:'connection refused'});expect(Number(d.next_at)).toBeGreaterThan(Date.now()+50000);
  expect(await runDue(env,down.fetcher)).toBe(0);
  const err=hook(()=>new Response('server busy',{status:503}));for(let i=1;i<MAX_ATTEMPTS;i++){await env.DB.prepare('UPDATE deliveries SET next_at=0').run();await runDue(env,err.fetcher);}
  d=(await deliveries())[0];expect(d).toMatchObject({status:'failed',attempts:MAX_ATTEMPTS,last_status:503,last_error:'server busy',next_at:null});
  const id=((await body(api('admin@example.com','/api/admin/forwards'))).deliveries as {id:number}[])[0].id;const ok=hook();
  expect(await body(handle(new Request(ORIGIN+'/api/admin/forwards/resend',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id})}),env,'admin@example.com',{fetcher:ok.fetcher}))).toEqual({ok:true,status:200,error:null});
  expect((await deliveries())[0]).toMatchObject({status:'delivered'});});
 it('validates rules, sends tests and is for admins only',async()=>{expect((await rule({url:'http://hooks.example.com'})).status).toBe(400);expect((await rule({headers:{'X-SMS-Signature':'x'}})).status).toBe(400);expect((await rule({senders:['bad']})).status).toBe(400);
  expect((await api('alice@example.com','/api/admin/forwards')).status).toBe(403);const id=(await body(rule())).id;const h=hook(()=>new Response('nope',{status:401}));
  expect(await body(handle(new Request(ORIGIN+'/api/admin/forwards/test',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id})}),env,'admin@example.com',{fetcher:h.fetcher}))).toEqual({ok:false,status:401,error:'nope'});
  expect(JSON.parse(String(h.calls[0].init.body))).toMatchObject({test:true,id:0});
  await api('admin@example.com','/api/admin/forwards/save',{id,name:'CRM',system_number:number,senders:[],url:'https://hooks.example.com/sms',format:'json',headers:{},active:false});const off=hook();await incoming(off);expect(off.calls).toHaveLength(0);
  expect((await api('admin@example.com','/api/admin/forwards/delete',{id})).status).toBe(200);expect(await audits()).toEqual(['forward.save','forward.test','forward.save','forward.delete']);});
});
describe('auto-reply bot',()=>{
 const steps=[{id:'s1',type:'options',text:'מעוניינים? 1 כן 2 לא',options:[{reply:'1, כן',meaning:'מעוניין',next:'s2'},{reply:'2',meaning:'לא מעוניין',next:'s4'}]},
  {id:'s2',type:'options',text:'איזה סניף? 1 תל אביב 2 חיפה',options:[{reply:'1',meaning:'תל אביב',next:'s3'},{reply:'2',meaning:'חיפה',next:'s3'}]},
  {id:'s3',type:'text',text:'מה השם המלא?',field:'name',next:'s5'},{id:'s5',type:'end',text:'תודה! נחזור אליך'},{id:'s4',type:'end',text:'תודה, לא נפנה שוב'}];
 const flow=(b:Record<string,unknown>={})=>api('admin@example.com','/api/admin/flows/save',{name:'סקר',system_number:number,trigger:'any',steps,fallback:'',expire_hours:24,active:true,...b});
 let n=0;const say=async(text:string,msgid=String(++n),from='0509876543')=>{const r=await ingest(callback('json',{origsms:text,msgid,phone:from}),env);expect(r.status).toBe(200);return (JSON.parse(await r.text()) as {reply:string}).reply;};
 it('walks the flow, reading the same reply by the current question',async()=>{expect((await flow()).status).toBe(200);
  expect(await say('שלום')).toBe('מעוניינים? 1 כן 2 לא');expect(await say('1')).toBe('איזה סניף? 1 תל אביב 2 חיפה');expect(await say(' 1.')).toBe('מה השם המלא?');expect(await say('דנה כהן')).toBe('תודה! נחזור אליך');
  expect((await env.DB.prepare('SELECT step,answer,meaning FROM bot_answers ORDER BY id').all()).results).toEqual([{step:'s1',answer:'1',meaning:'מעוניין'},{step:'s2',answer:' 1.',meaning:'תל אביב'},{step:'s3',answer:'דנה כהן',meaning:null}]);
  expect(await env.DB.prepare('SELECT data FROM contacts WHERE number=?').bind(peer).first()).toEqual({data:'{"name":"דנה כהן"}'});expect(await env.DB.prepare('SELECT 1 FROM conversations').first()).toBeNull();
  const out=(await read('alice@example.com','?direction=out')).messages;expect(out.map(m=>m.body)).toEqual(['תודה! נחזור אליך','מה השם המלא?','איזה סניף? 1 תל אביב 2 חיפה','מעוניינים? 1 כן 2 לא']);expect(out.every(m=>m.sent_by==='בוט'&&m.submission_status==='accepted')).toBe(true);
  expect(await say('שוב שלום')).toBe('מעוניינים? 1 כן 2 לא');});
 it('repeats a question twice for an unknown reply, then stops; a repeated webhook call does not advance',async()=>{await flow();await say('היי');
  expect(await say('אולי','dup')).toBe('לא זיהינו את התשובה.\nמעוניינים? 1 כן 2 לא');expect(await say('אולי','dup')).toBe('לא זיהינו את התשובה.\nמעוניינים? 1 כן 2 לא');
  expect(await say('אולי')).toBe('לא זיהינו את התשובה.\nמעוניינים? 1 כן 2 לא');expect(await say('אולי')).toBe('');expect(await env.DB.prepare('SELECT 1 FROM conversations').first()).toBeNull();});
 it('stops for opt-outs and blocked customers, expires idle conversations and prefers keyword flows',async()=>{await flow();await flow({name:'מבצע',trigger:'keyword',keyword:'מבצע',steps:[{id:'s1',type:'end',text:'פרטי המבצע: ...'}]});
  expect(await say('מבצע עכשיו')).toBe('פרטי המבצע: ...');expect(await say('שלום')).toBe('מעוניינים? 1 כן 2 לא');
  await env.DB.prepare('UPDATE conversations SET expires_at=1').run();expect(await say('2')).toBe('מעוניינים? 1 כן 2 לא');
  expect(await say('הסר')).toBe('');expect(await say('1')).toBe('');expect(await env.DB.prepare('SELECT 1 FROM conversations').first()).toBeNull();
  expect(await say('שלום','b1','0521112222')).toBe('מעוניינים? 1 כן 2 לא');expect((await api('alice@example.com','/api/bot/block',{system_number:number,peer_number:'0521112222',blocked:true})).status).toBe(200);
  expect(await say('1','b2','0521112222')).toBe('');expect((await api('bob@example.com','/api/bot/block',{system_number:number,peer_number:'0521112222',blocked:false})).status).toBe(403);
  await api('alice@example.com','/api/bot/block',{system_number:number,peer_number:'0521112222',blocked:false});expect(await say('1','b3','0521112222')).toBe('מעוניינים? 1 כן 2 לא');});
 it('starts a flow from a dashboard send, or turns the bot off for the recipients',async()=>{const id=(await body(flow({trigger:'send'}))).id as number;await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com'").run();
  const calls:string[]=[];const fetcher=async(_u:string,init:RequestInit)=>{calls.push(JSON.parse(String(init.body)).msg);return new Response('OK 7');};
  const sendAs=(b:Record<string,unknown>)=>handle(new Request(ORIGIN+'/api/send',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),system_number:number,recipients:[peer],body:'ignored',...b})}),{...env,MICROPAY_TOKEN:'t'},'alice@example.com',{fetcher}).catch(failure);
  expect(((await body(api('alice@example.com','/api/me'))).flows as {id:number;first:string}[])).toEqual([{id,name:'סקר',system_number:number,first:'מעוניינים? 1 כן 2 לא'}]);
  expect(await say('שלום')).toBe('');expect(await body(sendAs({flow_id:id}))).toMatchObject({status:'accepted'});expect(calls).toEqual(['מעוניינים? 1 כן 2 לא']);expect(await say('2')).toBe('תודה, לא נפנה שוב');
  const answer=(await read('alice@example.com','?direction=in')).messages[0];expect(await body(api('alice@example.com','/api/bot/info?id='+answer.id))).toMatchObject({blocked:null,answer:{question:'מעוניינים? 1 כן 2 לא',answer:'2',meaning:'לא מעוניין',flow:'סקר'}});
  await sendAs({flow_id:id});expect(await body(sendAs({body:'נציג אנושי כאן',stop_bot:true}))).toMatchObject({status:'accepted'});expect(await say('1')).toBe('');
  expect(await body(api('alice@example.com','/api/bot/info?id='+answer.id))).toMatchObject({blocked:{created_by:'alice@example.com'},conversation:null});
  expect((await sendAs({flow_id:999})).status).toBe(400);});
 it('sends replies through Micropay\'s API for numbers whose messages come from an automation',async()=>{await flow();
  expect((await api('admin@example.com','/api/admin/numbers/save',{number,label:'Office',active:true,bot_reply:'api'})).status).toBe(200);
  const calls:Record<string,string>[]=[];const fetcher=async(url:string,init:RequestInit)=>{calls.push({url,...JSON.parse(String(init.body))});return new Response('OK 77');};
  const via=async(text:string,msgid:string,e:Env)=>{const r=await ingest(callback('json',{origsms:text,msgid}),e,{fetcher});expect(r.status).toBe(200);return (JSON.parse(await r.text()) as {reply:string}).reply;};
  expect(await via('שלום','auto-1',{...env,MICROPAY_TOKEN:'t'})).toBe('');
  expect(calls).toEqual([{url:'https://www.micropay.co.il/extApi/scheduleSms.php',token:'t',from:'0501234567',msg:'מעוניינים? 1 כן 2 לא',list:'0509876543',desc:'sms-dashboard bot'}]);
  const logged=()=>env.DB.prepare("SELECT submission_status,provider_message_id FROM messages WHERE sent_by='בוט' ORDER BY id").all().then(r=>r.results);
  expect(await logged()).toEqual([{submission_status:'accepted',provider_message_id:'77'}]);
  expect(await via('שלום','auto-1',{...env,MICROPAY_TOKEN:'t'})).toBe('');expect(calls).toHaveLength(1);
  expect(await via('1','auto-2',env)).toBe('');expect(calls).toHaveLength(1);expect((await logged())[1]).toEqual({submission_status:'rejected',provider_message_id:null});
  expect((await body(api('admin@example.com','/api/admin/numbers'))).numbers).toEqual(expect.arrayContaining([expect.objectContaining({number,bot_reply:'api'})]));});
 it('validates flows',async()=>{expect((await flow({steps:[{...steps[0],options:[{reply:'1',meaning:'',next:'s9'}]}]})).status).toBe(400);expect((await flow({steps:[{...steps[0],options:[{reply:'1',meaning:'',next:''},{reply:'כן, 1',meaning:'',next:''}]}]})).status).toBe(400);
  expect((await flow({steps:[{id:'s1',type:'text',text:'שם?',field:'nope'}]})).status).toBe(400);expect((await flow()).status).toBe(200);expect((await flow({name:'שני'})).status).toBe(409);expect((await flow({name:'שני',active:false})).status).toBe(200);
  expect((await api('alice@example.com','/api/admin/flows')).status).toBe(403);});
});
describe('Cloudflare Access sync',()=>{
 const policyId='policy-1',appId='app-1';
 function fakeCloudflare(opts:{appScoped?:boolean;failPut?:boolean}={}){const calls:{method:string;url:string;body?:unknown}[]=[];
  let policy:Record<string,unknown>={id:policyId,name:'Dashboard users',decision:'allow',created_at:'x',reusable:true,include:[{email:{email:'old@example.com'}},{email_domain:{domain:'example.org'}}],exclude:[],require:[],session_duration:'24h'};
  const fetcher=async(url:string,init:RequestInit)=>{const method=init.method||'GET';calls.push({method,url,body:init.body?JSON.parse(String(init.body)):undefined});
   expect((init.headers as Record<string,string>).Authorization).toBe('Bearer token');const ok=(result:unknown)=>new Response(JSON.stringify({success:true,result}));
   const reusable=url.endsWith('/access/policies/'+policyId),scoped=url.endsWith('/access/apps/'+appId+'/policies/'+policyId);
   if(reusable&&opts.appScoped)return new Response(JSON.stringify({success:false,errors:[{message:'not found'}]}),{status:404});
   if(url.includes('/access/apps?'))return ok([{id:'other',aud:'x'},{id:appId,aud:'the-aud'}]);
   if(reusable||scoped){if(method==='PUT'){if(opts.failPut)return new Response(JSON.stringify({success:false,errors:[{message:'Authentication error'}]}),{status:403});policy={...policy,...(init.body?JSON.parse(String(init.body)):{})};}return ok(policy);}
   return new Response('{}',{status:404});};
  return {fetcher,calls,policy:()=>policy};}
 const cfEnv=()=>({...env,CF_API_TOKEN:'token',ACCESS_ACCOUNT_ID:'acct',ACCESS_POLICY_ID:policyId,ACCESS_AUD:'the-aud'});
 const call=(cf:{fetcher:(u:string,i:RequestInit)=>Promise<Response>},path:string,b?:unknown)=>handle(new Request(ORIGIN+path,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(b)}),cfEnv() as Env,'admin@example.com',{fetcher:cf.fetcher}).catch(failure);
 const save=(email:string,active:boolean)=>({create:false,email,role:'user',active,can_bulk_send:false,daily_limit:null,numbers:[]});
 it('writes active users into the policy, keeps other rules and read-only fields out',async()=>{const cf=fakeCloudflare();
  const d=await body(call(cf,'/api/admin/users/save',{...save('new@example.com',true),create:true}));expect(d.access).toMatchObject({ok:true,emails:5});
  const put=cf.calls.find(c=>c.method==='PUT')!;expect(put.url).toBe('https://api.cloudflare.com/client/v4/accounts/acct/access/policies/'+policyId);
  expect(put.body).toMatchObject({name:'Dashboard users',decision:'allow',session_duration:'24h'});expect(put.body).not.toHaveProperty('id');expect(put.body).not.toHaveProperty('created_at');
  expect(cf.policy().include).toEqual([{email_domain:{domain:'example.org'}},...['admin','alice','bob','new','shared'].map(n=>({email:{email:n+'@example.com'}}))]);
  cf.calls.length=0;await call(cf,'/api/admin/users/save',save('bob@example.com',true));expect(cf.calls).toHaveLength(0);
  expect((await body(call(cf,'/api/admin/users/save',save('bob@example.com',false)))).access).toMatchObject({ok:true,emails:4});expect(JSON.stringify(cf.policy().include)).not.toContain('bob@');
  expect((await body(call(cf,'/api/admin/users/delete',{email:'alice@example.com'}))).access).toMatchObject({ok:true,emails:3});
  expect(((await body(call(cf,'/api/admin/users'))).access as {configured:boolean;last:{ok:boolean}})).toMatchObject({configured:true,last:{ok:true,emails:3}});});
 it('finds a policy inside the dashboard application by its AUD',async()=>{const cf=fakeCloudflare({appScoped:true});expect((await body(call(cf,'/api/admin/users/access-sync',{}))).access).toMatchObject({ok:true,emails:4});
  expect(cf.calls.find(c=>c.method==='PUT')!.url).toBe('https://api.cloudflare.com/client/v4/accounts/acct/access/apps/'+appId+'/policies/'+policyId);});
 it('saves the user even when Cloudflare refuses, and reports why',async()=>{const cf=fakeCloudflare({failPut:true});
  const d=await body(call(cf,'/api/admin/users/save',{...save('new@example.com',true),create:true}));expect(d).toMatchObject({ok:true,access:{ok:false,error:'Authentication error'}});
  expect(await env.DB.prepare("SELECT 1 AS x FROM users WHERE email='new@example.com'").first()).toEqual({x:1});expect((await audits()).slice(-1)).toEqual(['access.sync']);});
 it('does nothing when not configured',async()=>{expect(await body(api('admin@example.com','/api/admin/users/save',{...save('new@example.com',true),create:true}))).toEqual({ok:true,access:null});
  expect((await api('admin@example.com','/api/admin/users/access-sync',{})).status).toBe(503);});
});
describe('message variables',()=>{
 const third='+972509876544',fourth='+972509876545';
 const calls:{msg:string;list:string}[]=[];const fetcher=async(_u:string,init:RequestInit)=>{const b=JSON.parse(String(init.body));calls.push({msg:b.msg,list:b.list});return new Response('OK '+calls.length);};
 const sendAs=(b:Record<string,unknown>,path='/api/send')=>handle(new Request(ORIGIN+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),system_number:number,...b})}),{...env,MICROPAY_TOKEN:'t'},'admin@example.com',{fetcher}).catch(failure);
 beforeEach(async()=>{calls.length=0;await api('admin@example.com','/api/admin/settings',{optout_text:'להסרה השיבו הסר'});await api('admin@example.com','/api/admin/contacts/save',{number:peer,data:{name:'דנה'}});});
 it('fills each recipient\'s text and sends identical texts together',async()=>{
  const d=await body(sendAs({recipients:[peer,third,fourth],body:'שלום {שם|לקוח יקר}!'}));expect(d).toMatchObject({status:'accepted',sent:3,counts:{accepted:3,rejected:0,unknown:0}});
  expect(calls.sort((a,b)=>a.list.length-b.list.length)).toEqual([{msg:'שלום דנה!\r\nלהסרה השיבו הסר',list:'0509876543'},{msg:'שלום לקוח יקר!\r\nלהסרה השיבו הסר',list:'0509876544,0509876545'}]);
  const rows=(await env.DB.prepare("SELECT peer_number,body,provider_message_id FROM messages WHERE direction='out' ORDER BY peer_number").all()).results;
  expect(rows.map(r=>(r as {body:string}).body)).toEqual(['שלום דנה!\nלהסרה השיבו הסר','שלום לקוח יקר!\nלהסרה השיבו הסר','שלום לקוח יקר!\nלהסרה השיבו הסר']);
  calls.length=0;await sendAs({recipients:[third],body:'המספר שלך {טלפון}, שם: {שם}.'});expect(calls).toEqual([{msg:'המספר שלך 0509876544, שם: .',list:'0509876544'}]);
  calls.length=0;await sendAs({recipients:[peer],body:'אישי {שם}',bulk:true});expect(calls[0].msg).toBe('אישי דנה\r\nלהסרה השיבו הסר');});
 it('refuses unknown variables and personalized batches over 40, and previews',async()=>{expect(await body(sendAs({recipients:[peer],body:'היי {כתובת}'}))).toEqual({error:'Unknown variable: {כתובת}'});
  expect((await sendAs({recipients:Array.from({length:41},(_,i)=>'05090000'+String(i).padStart(2,'0')),body:'היי {שם}'})).status).toBe(413);expect(calls).toHaveLength(0);
  expect(await body(sendAs({recipient:'0509876543',body:'שלום {שם}',bulk:true},'/api/send/preview'))).toEqual({body:'שלום דנה\nלהסרה השיבו הסר',unknown:[]});});
 it('fills variables in bot replies, including an answer saved in the same step',async()=>{
  await api('admin@example.com','/api/admin/flows/save',{name:'שם',system_number:number,trigger:'any',steps:[{id:'s1',type:'text',text:'היי {שם|חבר}, מה שמך?',field:'name',next:'s2'},{id:'s2',type:'end',text:'תודה {שם}!'}],fallback:'',expire_hours:24,active:true});
  const say=async(t:string,msgid:string)=>JSON.parse(await (await ingest(callback('json',{origsms:t,msgid,phone:'0521112222'}),env)).text()).reply;
  expect(await say('שלום','v1')).toBe('היי חבר, מה שמך?');expect(await say('נועה','v2')).toBe('תודה נועה!');});
});
describe('scheduled sends',()=>{
 const third='+972509876544';
 const calls:Record<string,unknown>[]=[];const fetcher=async(_u:string,init:RequestInit)=>{calls.push(JSON.parse(String(init.body)));return new Response('OK '+(100+calls.length));};
 const menv=()=>({...env,MICROPAY_TOKEN:'t'}) as Env;
 const req=(email:string,path:string,b?:unknown)=>handle(new Request(ORIGIN+path,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(b)}),menv(),email,{fetcher}).catch(failure);
 const later=(b:Record<string,unknown>,email='admin@example.com')=>req(email,'/api/send',{id:crypto.randomUUID(),system_number:number,recipients:[peer,third],body:'תזכורת',send_at:Date.now()+3600000,...b});
 const due=()=>env.DB.prepare("UPDATE scheduled_sends SET send_at=1").run();
 beforeEach(()=>{calls.length=0;});
 it('waits until its time, then sends with opt-outs as they are then',async()=>{const d=await body(later({}));expect(d).toMatchObject({scheduled:true,recipients:2});expect(calls).toHaveLength(0);
  expect(await runScheduled(menv(),fetcher)).toBe(false);await api('admin@example.com','/api/admin/optouts/add',{numbers:[third]});await due();
  expect(await runScheduled(menv(),fetcher)).toBe(true);expect(calls).toEqual([{token:'t',from:'0501234567',msg:'תזכורת',list:'0509876543',desc:'sms-dashboard scheduled admin@example.com'}]);
  expect(await runScheduled(menv(),fetcher)).toBe(false);
  const list=(await body(req('admin@example.com','/api/scheduled'))).scheduled as Record<string,unknown>[];expect(list[0]).toMatchObject({status:'sent',recipients:2,result:{sent:1,accepted:1,rejected:0,unknown:0,opted_out:1}});
  expect((await env.DB.prepare("SELECT sent_by,submission_status FROM messages WHERE direction='out'").all()).results).toEqual([{sent_by:'admin@example.com',submission_status:'accepted'}]);
  expect((await req('admin@example.com','/api/scheduled/cancel',{id:list[0].id})).status).toBe(409);});
 it('can be cancelled or moved while waiting, by its owner or an admin',async()=>{await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com'").run();await env.DB.prepare("UPDATE users SET can_bulk_send=1 WHERE email='alice@example.com'").run();
  const a=(await body(later({},'alice@example.com'))).id as string;const b=(await body(later({},'alice@example.com'))).id as string;
  expect(((await body(req('bob@example.com','/api/scheduled'))).scheduled as unknown[])).toHaveLength(0);expect((await req('bob@example.com','/api/scheduled/cancel',{id:a})).status).toBe(404);
  expect((await req('alice@example.com','/api/scheduled/cancel',{id:a})).status).toBe(200);expect((await req('admin@example.com','/api/scheduled/reschedule',{id:b,send_at:Date.now()+7200000})).status).toBe(200);
  expect((await req('alice@example.com','/api/scheduled/reschedule',{id:b,send_at:Date.now()})).status).toBe(400);
  await due();await env.DB.prepare("UPDATE scheduled_sends SET send_at=? WHERE id=?").bind(Date.now()+60000,b).run();expect(await runScheduled(menv(),fetcher)).toBe(false);expect(calls).toHaveLength(0);
  expect(((await body(req('admin@example.com','/api/scheduled'))).scheduled as {status:string}[]).map(x=>x.status)).toEqual(['scheduled','cancelled']);});
 it('validates when scheduling and fails cleanly when the sender lost access',async()=>{expect((await later({send_at:Date.now()+1000})).status).toBe(400);expect((await later({test:true,recipients:[peer]})).status).toBe(400);expect((await later({body:'היי {כתובת}'})).status).toBe(400);
  await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com'").run();await later({recipients:[peer]},'alice@example.com');await env.DB.prepare("UPDATE users SET active=0 WHERE email='alice@example.com'").run();await due();
  await runScheduled(menv(),fetcher);expect(calls).toHaveLength(0);const s=await env.DB.prepare('SELECT status,result FROM scheduled_sends').first<{status:string;result:string}>();expect(s!.status).toBe('failed');expect(JSON.parse(s!.result).error).toBe('The user who scheduled this send is no longer active');});
 it('sends large personalized sends over several runs, or in one listjson call when enabled',async()=>{const many=Array.from({length:35},(_,i)=>'05090000'+String(i).padStart(2,'0'));
  await later({recipients:many,body:'שלום {שם|חבר} {טלפון}'});await due();expect(await runScheduled(menv(),fetcher)).toBe(true);expect(calls).toHaveLength(30);
  expect(await env.DB.prepare('SELECT status,progress FROM scheduled_sends').first()).toEqual({status:'scheduled',progress:30});
  await runScheduled(menv(),fetcher);expect(calls).toHaveLength(35);expect(await env.DB.prepare('SELECT status,progress FROM scheduled_sends').first()).toEqual({status:'sent',progress:35});
  calls.length=0;await api('admin@example.com','/api/admin/settings',{micropay_listjson:true});await api('admin@example.com','/api/admin/contacts/save',{number:peer,data:{name:'דנה'}});
  const now=await body(req('admin@example.com','/api/send',{id:crypto.randomUUID(),system_number:number,recipients:[peer,third],body:'שלום {שם|חבר}'}));expect(now).toMatchObject({status:'accepted',sent:2});
  expect(calls).toEqual([{token:'t',from:'0501234567',listjson:{'0509876543':'שלום דנה','0509876544':'שלום חבר'},desc:'sms-dashboard admin@example.com'}]);});
});
describe('view restrictions',()=>{
 const T=Date.UTC(2026,9,10,12,0);const A='+972521000001',B='+972521000002',C='+972521000003';
 beforeEach(async()=>{const ins=(key:string,peer_:string,body_:string,at:number,dir='in',sys=number)=>env.DB.prepare("INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,updated_at) VALUES (?,?,?,?,?,?,?,'receipt',?,?)").bind(key,dir,sys,peer_,body_,at,at,dir==='out'?'accepted':null,at);
  await env.DB.batch([ins('old',A,'ישנה',T-3600000),ins('newA',A,'חדשה',T+1000),ins('newB',B,'שלום',T+2000),ins('newC',C,'כן',T+3000),ins('outA',A,'תשובה',T+4000,'out'),ins('urgent',A,'דחוף מאוד',T+5000),ins('sales',B,'מכירות',T-7200000,'in',other),
   env.DB.prepare("INSERT INTO contacts (number,data,updated_at) VALUES (?,'{\"name\":\"מצפה רמון\"}',1)").bind(B),
   env.DB.prepare("INSERT INTO bot_answers (flow_id,system_number,peer_number,step,question,answer,meaning,at) VALUES (1,?,?,'s1','q','1','מעוניין',1)").bind(number,C)]);});
 const limit=(view_from:number|null,view_rules:unknown)=>api('admin@example.com','/api/admin/users/save',{email:'alice@example.com',role:'user',active:true,can_bulk_send:false,daily_limit:null,numbers:[{number,can_send:true,view_from,view_rules},{number:other,can_send:false}]});
 const seen=async(q='')=>(await read('alice@example.com',q)).messages.map(m=>m.body).sort();
 it('limits by start date and by each kind of condition, all of which must match',async()=>{
  expect((await limit(T,null)).status).toBe(200);expect(await seen()).toEqual(['דחוף מאוד','חדשה','כן','מכירות','שלום','תשובה'].sort());
  await limit(null,[{type:'field',field:'name',op:'eq',value:'מצפה רמון'}]);expect(await seen()).toEqual(['מכירות','שלום']);
  await limit(null,[{type:'answer',op:'eq',value:'מעוניין'}]);expect(await seen()).toEqual(['כן','מכירות']);
  await limit(null,[{type:'text',value:'דחוף'}]);expect(await seen()).toEqual(['דחוף מאוד','מכירות']);
  await limit(null,[{type:'direction',value:'out'}]);expect(await seen()).toEqual(['מכירות','תשובה']);
  await limit(T,[{type:'direction',value:'in'},{type:'field',field:'name',op:'contains',value:'רמון'}]);expect(await seen()).toEqual(['מכירות','שלום']);
  expect(((await body(api('alice@example.com','/api/me'))).numbers as {number:string;restricted:number}[]).map(n=>[n.number,n.restricted])).toEqual([[number,1],[other,0]]);
  expect(((await body(api('admin@example.com','/api/admin/users'))).users as {email:string;numbers:{view_from:number|null;view_rules:unknown}[]}[]).find(u=>u.email==='alice@example.com')!.numbers).toEqual(expect.arrayContaining([expect.objectContaining({view_from:T,view_rules:[{type:'direction',value:'in'},{type:'field',field:'name',op:'contains',value:'רמון'}]})]));});
 it('applies the same limits to counts, export, live updates, conversations, bot state and contact edits',async()=>{await limit(T,[{type:'field',field:'name',op:'eq',value:'מצפה רמון'}]);
  expect(await body(api('alice@example.com','/api/stats'))).toMatchObject({total:2,peers:1});
  expect(((await body(api('alice@example.com','/api/messages?export=1&group=peer'))).peers as {peer_number:string}[]).map(r=>r.peer_number)).toEqual([B]);
  expect((await read('alice@example.com','?since='+encodeCursor({t:0,id:0}))).messages.map(m=>m.body).sort()).toEqual(['מכירות','שלום']);
  expect((await read('alice@example.com','?peer_number='+encodeURIComponent(A))).messages).toHaveLength(0);
  const hidden=(await env.DB.prepare("SELECT id FROM messages WHERE event_key='newA'").first<{id:number}>())!.id;const shown=(await env.DB.prepare("SELECT id FROM messages WHERE event_key='newB'").first<{id:number}>())!.id;
  expect((await api('alice@example.com','/api/bot/info?id='+hidden)).status).toBe(404);expect((await api('alice@example.com','/api/bot/info?id='+shown)).status).toBe(200);
  expect((await api('alice@example.com','/api/bot/block',{system_number:number,peer_number:A,blocked:true})).status).toBe(403);expect((await api('alice@example.com','/api/bot/block',{system_number:number,peer_number:B,blocked:true})).status).toBe(200);
  expect((await api('alice@example.com','/api/contacts/save',{number:A,data:{name:'x'}})).status).toBe(403);expect((await api('alice@example.com','/api/contacts/save',{number:B,data:{id_number:'5'}})).status).toBe(200);
  expect(((await body(api('admin@example.com','/api/messages'))).messages as unknown[])).toHaveLength(7);});
 it('validates conditions',async()=>{expect((await limit(null,[{type:'field',field:'nope',op:'eq',value:'x'}])).status).toBe(400);expect((await limit(null,[{type:'text',value:''}])).status).toBe(400);
  expect((await limit(null,[{type:'direction',value:'both'}])).status).toBe(400);expect((await limit(-5,null)).status).toBe(400);expect((await limit(null,Array.from({length:11},()=>({type:'text',value:'a'})))).status).toBe(400);});
});
describe('export with one row per number',()=>{
 it('groups messages by customer with contact data, counts, the latest message and opt-out state',async()=>{const at=(n:number)=>new Date(Date.UTC(2026,9,1,8,n)).toISOString();
  await send({event_id:'g1',body:'ראשונה',occurred_at:at(1)});await send({event_id:'g2',body:'אחרונה',occurred_at:at(3)});await send({event_id:'g3',body:'תשובה',occurred_at:at(2),submission_status:'accepted'},true);
  await send({event_id:'g4',peer_number:'+972521112222',body:'שלום',occurred_at:at(5)});await send({event_id:'g5',system_number:other,peer_number:'+972531112222',body:'מכירות',occurred_at:at(6)});
  await api('admin@example.com','/api/admin/contacts/save',{number:peer,data:{name:'דנה',id_number:'123'}});await api('admin@example.com','/api/admin/optouts/add',{numbers:['0521112222']});
  const all=await body(api('alice@example.com','/api/messages?export=1&group=peer&columns=peer,c:name'));
  expect(all).toEqual({truncated:false,peers:[{peer_number:'+972531112222',total:1,incoming:1,outgoing:0,last_at:Date.parse(at(6)),last_direction:'in',last_body:'מכירות',last_number:other,contact:null,opted_out:0},
   {peer_number:'+972521112222',total:1,incoming:1,outgoing:0,last_at:Date.parse(at(5)),last_direction:'in',last_body:'שלום',last_number:number,contact:null,opted_out:1},
   {peer_number:peer,total:3,incoming:2,outgoing:1,last_at:Date.parse(at(3)),last_direction:'in',last_body:'אחרונה',last_number:number,contact:{name:'דנה',id_number:'123'},opted_out:0}]});
  expect(((await body(api('alice@example.com','/api/messages?export=1&group=peer&direction=out'))).peers as {peer_number:string;total:number}[]).map(r=>[r.peer_number,r.total])).toEqual([[peer,1]]);
  expect(((await body(api('bob@example.com','/api/messages?export=1&group=peer'))).peers as {peer_number:string}[]).map(r=>r.peer_number)).toEqual(['+972531112222']);
  expect((await api('alice@example.com','/api/messages?group=peer')).status).toBe(400);
  expect((await env.DB.prepare("SELECT details FROM audit_log WHERE action='export' ORDER BY id LIMIT 1").first<{details:string}>())!.details).toContain('"group":"peer"');});
});
describe('contact fields limit',()=>{
 it('allows 20 contact fields, refuses 21, and lets users show them all as columns',async()=>{const fields=(n:number)=>Array.from({length:n},(_,i)=>({id:'f'+i,label:'שדה '+(i+1)}));
  expect((await api('admin@example.com','/api/admin/settings',{contact_fields:fields(21)})).status).toBe(400);expect((await api('admin@example.com','/api/admin/settings',{contact_fields:fields(20)})).status).toBe(200);
  expect(((await body(api('alice@example.com','/api/me'))).contact_fields as unknown[])).toHaveLength(20);
  const columns=['time','direction','peer','number','body','status','sent_by','received',...fields(20).map(f=>'c:'+f.id)];expect((await api('alice@example.com','/api/me/prefs',{columns})).status).toBe(200);
  expect((await api('alice@example.com','/api/messages?cf_f19=x')).status).toBe(200);});
});
describe('phone number parsing',()=>{
 const cases:[string,string][]=[['050-123-4567','+972501234567'],['0501234567','+972501234567'],['501234567','+972501234567'],['972501234567','+972501234567'],['+972-50-123-4567','+972501234567'],
  ['+972 (0)50-123-4567','+972501234567'],['9720501234567','+972501234567'],['00972501234567','+972501234567'],['‪050-1234567‬','+972501234567'],['⁦050 123 4567⁩','+972501234567'],
  ['050 123 4567','+972501234567'],['050-1234567 בית','+972501234567'],['טל: 050-1234567','+972501234567'],['02-6251234','+97226251234'],['26251234','+97226251234'],['077-1234567','+972771234567'],
  ['+447700900123','+447700900123'],['050-123456','too_short'],['05012345678','bad_length'],['5.01235E+08','scientific'],['1-800-123-456','bad_prefix'],['abc','no_number'],['12','too_short'],
  ['050-1234567 / 052-7654321','several'],['','empty']];
 const browser=new Function(PHONE_JS+';return parsePhone;')() as (v:string)=>{number?:string;problem?:string};
 it.each(cases)('%s',(input,expected)=>{const want=expected.startsWith('+')?{number:expected}:{problem:expected};expect(parseRecipient(input)).toEqual(want);expect(browser(input)).toEqual(want);});
});
describe('message import',()=>{
 const t0=Date.UTC(2026,9,7,9,0);
 const row=(r:Record<string,unknown>)=>({row:2,direction:'in',system_number:number,peer_number:'0509876543',body:'שלום',occurred_at:t0,...r});
 async function start(total=10){return (await body(api('admin@example.com','/api/admin/imports/start',{file:'history.xlsx',total}))).id as number;}
 const rowsOf=(id:number,rows:unknown[])=>api('admin@example.com','/api/admin/imports/rows',{id,rows});
 it('stores rows, skips duplicates by message ID, within 10 minutes and on re-upload, and adds opt-outs',async()=>{
  expect((await ingestion.fetch(callback('json',{msgid:'mp-1'}),env)).status).toBe(200);
  const id=await start();
  const rows=[row({msgid:'mp-1',body:message}),row({row:3,body:'כן'}),row({row:4,body:'כן',n:1}),row({row:5,direction:'out',body:'תודה',status:'rejected',occurred_at:t0+60000}),row({row:6,body:'הסר',peer_number:'0521112222'}),row({row:7,body:'בלי זמן',occurred_at:null}),row({row:8,system_number:'0501234569'}),row({row:9,peer_number:'abc'})];
  const first=await body(rowsOf(id,rows));expect(first).toMatchObject({added:5,duplicates:1});expect(first.invalid).toEqual([{row:8,reason:'מספר המערכת אינו רשום או אינו פעיל'},{row:9,reason:'מספר הלקוח אינו תקין'}]);
  expect(await body(rowsOf(id,rows))).toMatchObject({added:0,duplicates:6});
  expect(await body(rowsOf(id,[row({row:10,body:'כן',occurred_at:t0+9*60000}),row({row:11,body:'כן',occurred_at:t0+11*60000})]))).toMatchObject({added:1,duplicates:1});
  const stored=await env.DB.prepare('SELECT direction,body,occurred_at,time_source,submission_status,import_id FROM messages WHERE import_id=? ORDER BY id').bind(id).all<Record<string,unknown>>();
  expect(stored.results.map(r=>r.body)).toEqual(['כן','כן','תודה','הסר','בלי זמן','כן']);expect(stored.results[2]).toMatchObject({direction:'out',submission_status:'rejected',time_source:'provider'});expect(stored.results[4]).toMatchObject({time_source:'receipt'});
  expect(await env.DB.prepare("SELECT source FROM opt_outs WHERE number='+972521112222'").first()).toEqual({source:'keyword'});
  expect((await body(api('admin@example.com','/api/admin/imports'))).imports).toMatchObject([{id,file:'history.xlsx',added:6,duplicates:8,invalid:4}]);
  expect(((await read('alice@example.com','?limit=100')).messages.filter(m=>m.import_id===id))).toHaveLength(6);});
 it('undoes exactly the messages an import added',async()=>{expect((await send({})).status).toBe(200);const id=await start();await rowsOf(id,[row({body:'a'}),row({body:'b'})]);
  expect(await body(api('admin@example.com','/api/admin/imports/undo',{id}))).toEqual({removed:2});expect((await read('alice@example.com')).messages).toHaveLength(1);
  expect((await api('admin@example.com','/api/admin/imports/undo',{id})).status).toBe(409);expect((await rowsOf(id,[row({body:'c'})])).status).toBe(409);
  expect(await audits()).toEqual(['messages.import','messages.import.undo']);});
 it('is for admins only and validates batches',async()=>{expect((await api('alice@example.com','/api/admin/imports/start',{file:'x',total:1})).status).toBe(403);expect((await api('alice@example.com','/api/admin/imports')).status).toBe(403);
  const id=await start();expect((await rowsOf(id,[])).status).toBe(400);expect((await rowsOf(id,Array.from({length:501},()=>row({})))).status).toBe(400);expect((await rowsOf(999,[row({})])).status).toBe(404);
  expect(await body(rowsOf(id,[row({direction:'sideways'}),row({occurred_at:'yesterday'}),row({body:' '})]))).toMatchObject({added:0,invalid:[{reason:'כיוון לא תקין'},{reason:'תאריך לא תקין'},{reason:'ההודעה ריקה'}]});});
});
describe('D1 rows read',()=>{
 // Records rows_read per query, since D1 bills rows read rather than rows returned.
 function metered(){const log:{sql:string;read:number}[]=[];const wrap=(st:D1PreparedStatement,sql:string):D1PreparedStatement=>new Proxy(st,{get(t,k){if(k==='bind')return(...a:unknown[])=>wrap(t.bind(...a),sql);if(k==='all')return async()=>{const r=await t.all();log.push({sql,read:r.meta.rows_read});return r;};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}});
  const db=new Proxy(env.DB,{get(t,k){if(k==='prepare')return(sql:string)=>wrap(t.prepare(sql),sql);const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}});return {env:{...env,DB:db},log};}
 beforeEach(async()=>{await env.DB.prepare("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<500) INSERT INTO messages(event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,updated_at) SELECT 'bulk'||i,'in',?,'+9725099'||printf('%05d',i%50),'x',i*1000,i*1000,'receipt',i*1000 FROM n").bind(number).run();});
 it('reads only new rows when polling and one page when opening the table',async()=>{for(const who of [user('alice@example.com'),user('admin@example.com','admin')]){
  const m=metered();const first=await (await data(new URL('https://dashboard.test/api/messages?limit=100'),m.env,who)).json() as {sync_cursor:string};
  expect(m.log.at(-1)!.read).toBeLessThan(150);
  await data(new URL('https://dashboard.test/api/messages?limit=100&since='+encodeURIComponent(first.sync_cursor)),m.env,who);expect(m.log.at(-1)!.read).toBeLessThan(10);
  await data(new URL('https://dashboard.test/api/messages?limit=100&since='+encodeURIComponent(encodeCursor({t:400000,id:0}))),m.env,who);expect(m.log.at(-1)!.read).toBeLessThan(120);}});
 it('reads one page of bot chats when opening the chats page and only changed chats when polling',async()=>{
  await env.DB.prepare("INSERT INTO bot_threads (system_number,peer_number,started_at,last_at,updated_at) SELECT ?,'+9725099'||printf('%05d',i),i,i,i FROM (WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<49) SELECT i FROM n)").bind(number).run();
  for(const who of [user('alice@example.com'),user('admin@example.com','admin')]){const m=metered();
   const first=await (await chats(new URL('https://dashboard.test/api/chats?limit=10'),m.env,who)).json() as {threads:unknown[];sync_cursor:string};expect(first.threads).toHaveLength(10);expect(m.log.at(-1)!.read).toBeLessThan(120);
   await chats(new URL('https://dashboard.test/api/chats?since='+encodeURIComponent(first.sync_cursor)),m.env,who);expect(m.log.at(-1)!.read).toBeLessThan(10);}});
});
describe('Micropay submission responses',()=>{
 it('recognizes plain and JSON queue acceptance, including validate variants',()=>{for(const raw of ['OK 34556','OK 250 34556','OK VALID 34556',{status:1,message:'OK',data:{taskId:'34556'}}])expect(micropaySubmission(raw)).toEqual({submission_status:'accepted',task_id:'34556'});});
 it('does not treat status=1 alone, timeouts or unknown responses as acceptance',()=>{expect(micropaySubmission({status:1,message:'NOT_ENOUGH_CREDIT'})).toEqual({submission_status:'unknown'});expect(micropaySubmission('timeout')).toEqual({submission_status:'unknown'});expect(micropaySubmission({status:0,message:'ERROR'})).toEqual({submission_status:'rejected'});expect(micropaySubmission('ERROR --> Description: invalid token')).toEqual({submission_status:'rejected'});});
});
describe('tracked links',()=>{
 const third='+972509876544',base='https://l.test',iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
 const calls:{msg?:string;list?:string;listjson?:Record<string,string>}[]=[];const fetcher=async(_u:string,init:RequestInit)=>{calls.push(JSON.parse(String(init.body)));return new Response('OK '+calls.length);};
 const sendAs=(b:Record<string,unknown>,email='admin@example.com')=>handle(new Request(ORIGIN+'/api/send',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),system_number:number,recipients:[peer,third],body:'מבצע https://shop.example.com/sale ושוב www.shop.example.com.',...b})}),{...env,MICROPAY_TOKEN:'t'},email,{fetcher}).catch(failure);
 // Opens a link like a phone would, waiting for the click to be counted.
 async function open(code:string,init:RequestInit&{agent?:string}={}){const pending:Promise<unknown>[]=[];const r=await redirect(new Request(base+'/'+code,{method:init.method,headers:init.agent===''?{}:{'User-Agent':init.agent??iphone}}),env,p=>pending.push(p));await Promise.all(pending);return r;}
 const links=async()=>(await env.DB.prepare('SELECT code,peer_number,url,clicks,auto_clicks,first_click_at FROM links ORDER BY peer_number,url').all<{code:string;peer_number:string;url:string;clicks:number;auto_clicks:number;first_click_at:number|null}>()).results;
 const message=(n:string)=>env.DB.prepare("SELECT body,clicks,auto_clicks,clicked_at FROM messages WHERE direction='out' AND peer_number=?").bind(n).first<{body:string;clicks:number|null;auto_clicks:number|null;clicked_at:number|null}>();
 // Links made in a test are moments old, which would make every click look automatic.
 const age=()=>env.DB.prepare('UPDATE links SET created_at=created_at-60000').run();
 beforeEach(async()=>{calls.length=0;await api('admin@example.com','/api/admin/settings',{link_base:base+'/'});});
 const cases:[string,string[]][]=[['ראו https://example.com/a?b=1.',['https://example.com/a?b=1']],['www.site.co.il, תודה',['https://www.site.co.il']],['(https://ex.com/x)',['https://ex.com/x']],
  ['שניים: https://a.com https://b.org/p?q="x"',['https://a.com','https://b.org/p?q=']],['אתר: https://ex.co.il/דף-הבית!',['https://ex.co.il/דף-הבית']],['HTTPS://EX.COM/Path',['HTTPS://EX.COM/Path']],
  ['http://localhost:3000 ו-https://intranet',[]],['mail@x.com או x.com',[]],['https://ex.com…\nשורה',['https://ex.com']]];
 const browser=new Function(LINKS_JS+';return findLinks;')() as typeof findLinks;
 it.each(cases)('finds the links in %s',(text,urls)=>{expect(findLinks(text).map(f=>f.url)).toEqual(urls);expect(browser(text)).toEqual(findLinks(text));});
 it('validates the link address setting',async()=>{expect(await body(api('admin@example.com','/api/admin/settings',{}))).toMatchObject({link_base:base});
  for(const v of ['l.test','http://l.test','https://l.test/x','https://l_test.com'])expect((await api('admin@example.com','/api/admin/settings',{link_base:v})).status).toBe(400);
  expect(await body(api('admin@example.com','/api/admin/settings',{link_base:'http://localhost:8792'}))).toMatchObject({link_base:'http://localhost:8792'});
  expect(await body(api('admin@example.com','/api/admin/settings',{link_base:''}))).toMatchObject({link_base:''});expect((await sendAs({track_links:true})).status).toBe(400);});
 it('gives every recipient their own short link for each link, stored before Micropay is called',async()=>{
  const d=await body(sendAs({track_links:true}));expect(d).toMatchObject({status:'accepted',sent:2});expect(calls).toHaveLength(2);
  const l=await links();expect(l.map(x=>[x.peer_number,x.url])).toEqual([[peer,'https://shop.example.com/sale'],[peer,'https://www.shop.example.com'],[third,'https://shop.example.com/sale'],[third,'https://www.shop.example.com']]);
  expect(new Set(l.map(x=>x.code)).size).toBe(4);for(const x of l)expect(x.code).toMatch(/^[A-Za-z0-9]{7}$/);
  const m=await message(peer);const mine=l.filter(x=>x.peer_number===peer);expect(m).toMatchObject({clicks:0,auto_clicks:0,clicked_at:null});
  expect(m!.body).toBe('מבצע '+base+'/'+mine.find(x=>x.url.endsWith('/sale'))!.code+' ושוב '+base+'/'+mine.find(x=>x.url.includes('www'))!.code+'.');
  expect(calls.map(c=>c.msg!.replace(/\r\n/g,'\n')).sort()).toEqual([m!.body,(await message(third))!.body].sort());
  const log=JSON.parse((await env.DB.prepare("SELECT details FROM audit_log WHERE action='send'").first<{details:string}>())!.details);expect(log).toMatchObject({personalized:true,calls:2,tracked_links:4});
  calls.length=0;await env.DB.prepare('DELETE FROM messages').run();expect(await body(sendAs({}))).toMatchObject({status:'accepted',sent:2});expect(calls).toHaveLength(1);
  expect(calls[0].msg).toBe('מבצע https://shop.example.com/sale ושוב www.shop.example.com.');expect((await message(peer))!.clicks).toBeNull();});
 it('retries with new codes when a code is already taken',async()=>{const spy=vi.spyOn(crypto,'getRandomValues');
  // The first four codes come out the same, so storing the first attempt's links fails on the primary key.
  for(let i=0;i<4;i++)spy.mockImplementationOnce((a=>a) as typeof crypto.getRandomValues);
  try{expect(await body(sendAs({track_links:true}))).toMatchObject({status:'accepted',sent:2});}finally{spy.mockRestore();}
  const codes=(await links()).map(x=>x.code);expect(new Set(codes).size).toBe(4);expect(codes).not.toContain('AAAAAAA');expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM sends').first<{n:number}>())!.n).toBe(1);});
 it('tracks links filled in from variables and leaves the opt-out text alone, and refuses a message without links',async()=>{
  await api('admin@example.com','/api/admin/settings',{optout_text:'להסרה https://optout.example.com'});await api('admin@example.com','/api/admin/contacts/save',{number:peer,data:{name:'dana'}});
  await sendAs({body:'https://site.example.com/{שם|guest}',track_links:true});
  expect((await links()).map(x=>x.url)).toEqual(['https://site.example.com/dana','https://site.example.com/guest']);expect((await message(peer))!.body).toMatch(/^https:\/\/l\.test\/[A-Za-z0-9]{7}\nלהסרה https:\/\/optout\.example\.com$/);
  expect(await body(sendAs({body:'אין כאן קישור',track_links:true}))).toEqual({error:'The message has no links to track'});
  calls.length=0;expect((await sendAs({recipients:Array.from({length:41},(_,i)=>'05090000'+String(i).padStart(2,'0')),track_links:true})).status).toBe(413);expect(calls).toHaveLength(0);});
 it('redirects at once and counts taps by people apart from automatic opens',async()=>{
  await sendAs({body:'https://shop.example.com/sale',track_links:true});const code=(await links()).find(x=>x.peer_number===peer)!.code;
  const first=await open(code,{agent:'facebookexternalhit/1.1 Facebot Twitterbot/1.0'});expect(first.status).toBe(302);expect(first.headers.get('location')).toBe('https://shop.example.com/sale');
  expect(await message(peer)).toMatchObject({clicks:0,auto_clicks:1});await open(code);expect(await message(peer)).toMatchObject({clicks:0,auto_clicks:2});
  await age();await open(code,{method:'HEAD'});expect(await message(peer)).toMatchObject({clicks:0,auto_clicks:2});
  const before=Date.now();expect((await open(code)).status).toBe(302);const m=await message(peer);expect(m).toMatchObject({clicks:1,auto_clicks:2});expect(m!.clicked_at).toBeGreaterThanOrEqual(before);
  await open(code);expect((await message(peer))!.clicks).toBe(1);
  await env.DB.prepare('UPDATE links SET last_click_at=last_click_at-60000').run();await open(code+'.');expect(await message(peer)).toMatchObject({clicks:2,clicked_at:m!.clicked_at});
  await open(code,{agent:''});for(let i=0;i<5;i++)await open(code,{agent:'curl/8.0'});expect((await message(peer))!.auto_clicks).toBe(5);expect((await message(third))!.clicks).toBe(0);
  for(const path of ['ZZZZZZZ','abc','',code+'x'])expect((await open(path)).status).toBe(404);expect((await open('ZZZZZZZ')).headers.get('cache-control')).toBe('no-store');
  expect((await redirect(new Request(base+'/'+code,{method:'POST'}),env,()=>{})).status).toBe(405);});
 it('shows clicks in the table: filters, sorting and live updates',async()=>{
  await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com' AND system_number=?").bind(number).run();
  await sendAs({body:'https://shop.example.com',track_links:true});await sendAs({recipients:[peer],body:'בלי מעקב'});await age();
  const ids=async(q:string)=>(await read('alice@example.com',q)).messages.map(m=>[m.peer_number,m.clicks]);
  const opened=await read('alice@example.com');const sync=(opened as unknown as {sync_cursor:string}).sync_cursor;
  await open((await links()).find(x=>x.peer_number===third)!.code);
  expect(await ids('?clicks=clicked')).toEqual([[third,1]]);expect(await ids('?clicks=none')).toEqual([[peer,0]]);expect(await ids('?clicks=clicked,none&sort=clicks&order=desc')).toEqual([[third,1],[peer,0]]);
  expect(await ids('?clicks=auto')).toEqual([]);await expect(data(new URL(ORIGIN+'/api/messages?clicks=yes'),env,user('alice@example.com'))).rejects.toThrow('Invalid clicks');
  const page1=await data(new URL(ORIGIN+'/api/messages?sort=clicks&order=asc&limit=1'),env,user('alice@example.com')).then(r=>r.json()) as {messages:{clicks:number|null}[];next_cursor:string};
  expect(page1.messages[0].clicks).toBeNull();const page2=await read('alice@example.com','?sort=clicks&order=asc&limit=5&cursor='+page1.next_cursor);expect(page2.messages.map(m=>m.clicks)).toEqual([0,1]);
  const live=await read('alice@example.com','?since='+sync);expect(live.messages.map(m=>[m.peer_number,m.clicks])).toEqual([[third,1]]);});
 it('tracks links in scheduled sends when they go out',async()=>{
  const d=await body(sendAs({track_links:true,send_at:Date.now()+3600000}));expect(d).toMatchObject({scheduled:true});expect(await links()).toHaveLength(0);
  expect((await body(api('admin@example.com','/api/scheduled')) as {scheduled:{track_links:number}[]}).scheduled[0].track_links).toBe(1);
  await env.DB.prepare('UPDATE scheduled_sends SET send_at=1').run();expect(await runScheduled({...env,MICROPAY_TOKEN:'t'},fetcher)).toBe(true);
  expect(await links()).toHaveLength(4);expect((await message(peer))!.body).toMatch(/^מבצע https:\/\/l\.test\/[A-Za-z0-9]{7} ושוב/);});
});
describe('bot chats',()=>{
 const steps=[{id:'s1',type:'options',text:'מעוניינים? 1 כן 2 לא',options:[{reply:'1, כן',meaning:'מעוניין',next:'s2'},{reply:'2',meaning:'לא מעוניין',next:'s3'}]},
  {id:'s2',type:'text',text:'מה השם המלא?',field:'name',next:'s3'},{id:'s3',type:'end',text:'תודה!'}];
 const flow=async(b:Record<string,unknown>={})=>(await body(api('admin@example.com','/api/admin/flows/save',{name:'סקר',system_number:number,trigger:'any',steps,fallback:'',expire_hours:24,active:true,...b}))).id as number;
 let n=0;const say=async(text:string,from='0509876543')=>{const r=await ingest(callback('json',{origsms:text,msgid:'c'+(++n),phone:from}),env);expect(r.status).toBe(200);};
 const list=async(email:string,q='')=>body(api(email,'/api/chats'+q)) as Promise<{threads:{peer_number:string;state:string;flow:string;last:{body:string;direction:string}|null;updated_at:number}[];sync_cursor:string}>;
 const meta=(email:string,p=peer)=>api(email,'/api/chats/thread?system_number='+encodeURIComponent(number)+'&peer_number='+encodeURIComponent(p));
 const notes=async()=>(await env.DB.prepare('SELECT direction,body,bot FROM messages WHERE peer_number=? ORDER BY id').bind(peer).all<{direction:string;body:string;bot:string|null}>()).results.map(r=>[r.direction,r.body,r.bot?JSON.parse(r.bot):null]);
 it('records what the bot made of each reply and which question each bot message asks',async()=>{const id=await flow();
  await say('שלום');await say('3');await say('1');await say('דנה');
  expect(await notes()).toEqual([['in','שלום',{start:id}],['out','מעוניינים? 1 כן 2 לא',{flow:id,step:'s1',start:true}],
   ['in','3',{flow:id,step:'s1',match:'none',retry:1}],['out','לא זיהינו את התשובה.\nמעוניינים? 1 כן 2 לא',{flow:id,step:'s1',retry:1}],
   ['in','1',{flow:id,step:'s1',match:'option'}],['out','מה השם המלא?',{flow:id,step:'s2'}],['in','דנה',{flow:id,step:'s2',match:'text'}],['out','תודה!',{flow:id,step:'s3',end:true}]]);
  await env.DB.prepare('DELETE FROM messages').run();await env.DB.prepare('DELETE FROM bot_threads').run();
  await say('שלום');await say('x');await say('y');await say('z');
  expect((await notes()).slice(-1)).toEqual([['in','z',{flow:id,step:'s1',match:'none',gave_up:true}]]);
  expect((await read('alice@example.com','?direction=in&peer_number='+encodeURIComponent(peer))).messages[0].bot).toEqual({flow:id,step:'s1',match:'none',gave_up:true});});
 it('lists threads with their state, flow and latest message, and returns the bot state of one',async()=>{const id=await flow();
  await say('שלום');await say('1');
  const l=await list('alice@example.com');expect(l.threads).toHaveLength(1);expect(l.threads[0]).toMatchObject({peer_number:peer,state:'active',flow:'סקר',last:{body:'מה השם המלא?',direction:'out'}});
  expect(await body(api('alice@example.com','/api/chats/counts'))).toMatchObject({counts:{active:1,done:0,blocked:0,opted_out:0},flows:[{id,name:'סקר'}]});
  const m=await body(meta('alice@example.com'));expect(m).toMatchObject({conversation:{flow_id:id,step:'s2',retries:0},blocked:null,opted_out:null,answers:[{step:'s1',answer:'1',meaning:'מעוניין'}]});
  expect((m.flows as {steps:{id:string}[]}[])[0].steps.map(s=>s.id)).toEqual(['s1','s2','s3']);
  await say('דנה');expect((await list('alice@example.com')).threads[0]).toMatchObject({state:'done',last:{body:'תודה!'}});
  expect((await list('alice@example.com','?state=active')).threads).toHaveLength(0);expect((await list('alice@example.com','?state=done')).threads).toHaveLength(1);
  expect((await list('alice@example.com','?q=דנה')).threads).toHaveLength(1);expect((await list('alice@example.com','?q=0509876')).threads).toHaveLength(1);expect((await list('alice@example.com','?q=nobody')).threads).toHaveLength(0);
  expect((await list('alice@example.com','?flow='+(id+1))).threads).toHaveLength(0);expect((await api('alice@example.com','/api/chats?state=open')).status).toBe(400);});
 it('updates live for new messages, bot blocks and opt-outs',async()=>{await flow();const third='0521234567';
  await say('שלום');await say('שלום',third);const first=await list('alice@example.com');expect(first.threads).toHaveLength(2);
  const since=async(c:string)=>list('alice@example.com','?since='+c);
  let s=await since(first.sync_cursor);expect(s.threads).toHaveLength(0);
  await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com' AND system_number=?").bind(number).run();
  expect((await api('alice@example.com','/api/bot/block',{system_number:number,peer_number:peer,blocked:true})).status).toBe(200);
  s=await since(first.sync_cursor);expect(s.threads.map(t=>[t.peer_number,t.state])).toEqual([[peer,'blocked']]);
  await say('הסר',third);s=await since(s.sync_cursor);expect(s.threads.map(t=>[t.peer_number,t.state,t.last?.body])).toEqual([['+972521234567','opted_out','הסר']]);
  expect(await body(api('alice@example.com','/api/chats/counts'))).toMatchObject({counts:{active:0,blocked:1,opted_out:1}});
  // A message that starts a flow opens a thread; one that no flow answers does not.
  await say('שלום','0541112233');await env.DB.prepare('DELETE FROM flows').run();await say('עוד','0549998877');expect((await list('alice@example.com')).threads).toHaveLength(3);});
 it('shows threads only on the user\'s numbers and within their view restrictions',async()=>{await flow();await say('שלום');
  expect((await list('bob@example.com')).threads).toHaveLength(0);expect((await meta('bob@example.com')).status).toBe(404);
  expect((await list('admin@example.com')).threads).toHaveLength(1);
  await env.DB.prepare("UPDATE user_numbers SET view_from=? WHERE email='alice@example.com' AND system_number=?").bind(Date.now()+3600000,number).run();
  expect((await list('alice@example.com')).threads).toHaveLength(0);expect((await meta('alice@example.com')).status).toBe(404);
  expect(await body(api('alice@example.com','/api/chats/counts'))).toMatchObject({counts:{active:0}});});
 it('opens threads for a send that starts a flow and moves existing ones on other sends',async()=>{const id=await flow({trigger:'send'});
  const fetcher=async()=>new Response('OK 1');const sendAs=(b:Record<string,unknown>)=>handle(new Request(ORIGIN+'/api/send',{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify({id:crypto.randomUUID(),system_number:number,recipients:[peer],...b})}),{...env,MICROPAY_TOKEN:'t'},'admin@example.com',{fetcher}).catch(failure);
  expect((await sendAs({flow_id:id})).status).toBe(200);const l=await list('admin@example.com');expect(l.threads[0]).toMatchObject({peer_number:peer,state:'active',flow:'סקר'});
  expect(JSON.parse((await env.DB.prepare("SELECT bot FROM messages WHERE direction='out'").first<{bot:string}>())!.bot)).toEqual({flow:id,step:'s1',start:true});
  await sendAs({body:'תזכורת'});const s=await list('admin@example.com','?since='+l.sync_cursor);expect(s.threads[0].last?.body).toBe('תזכורת');
  await sendAs({recipients:['0541112233'],body:'בלי בוט'});expect((await list('admin@example.com')).threads).toHaveLength(1);});
 it('fills threads for conversations from before the chats page',async()=>{const id=await flow();await say('שלום');await say('1');await env.DB.prepare('DELETE FROM bot_threads').run();
  const sql=(await readFile(new URL('../migrations/0012_bot_threads.sql',import.meta.url),'utf8')).split(';').map(x=>x.trim()).find(x=>x.startsWith('INSERT INTO bot_threads'))!;await env.DB.prepare(sql).run();
  const row=await env.DB.prepare('SELECT flow_id,started_at,last_at FROM bot_threads').first<{flow_id:number;started_at:number;last_at:number}>();
  // A thread starts at the bot's first message, as it does live.
  const times=(await env.DB.prepare("SELECT MIN(CASE WHEN sent_by='בוט' THEN occurred_at END) AS a,MAX(occurred_at) AS b FROM messages").first<{a:number;b:number}>())!;
  expect(row).toEqual({flow_id:id,started_at:times.a,last_at:times.b});});
});
describe('sender IDs',()=>{
 const third='+972509876544',base='https://l.test';
 type Call={url:string;body:Record<string,unknown>};const calls:Call[]=[];
 // Fake Micropay: senderVerify answers by number and code; scheduleSms refuses the sender name BadName.
 const fetcher=async(url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));calls.push({url,body});
  if(url.endsWith('senderVerify.php')){const p=String(body.phone);if(p==='0520000000')return new Response('{"status":1,"message":"PHONE_EXIST"}');if(p==='0530000000')return new Response('{"status":0,"message":"MAX_SENT"}');if(p==='035551235')return new Response('ERROR --> Description: phone parameter, must be a valid Israeli phone');
   return new Response(body.code===undefined?'{"status":1,"message":"CODE_SENT","data":{"remoteIP":"1.2.3.4"}}':body.code==='12345'?'{"status":1,"message":"OK"}':'WRONG_CODE');}
  return new Response(body.from==='BadName'?'ERROR from parameter, sender id not approved':'OK '+calls.length);};
 const req=(email:string,path:string,b?:unknown)=>handle(new Request(ORIGIN+path,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(b)}),{...env,MICROPAY_TOKEN:'t'} as Env,email,{fetcher}).catch(failure);
 const send=(b:Record<string,unknown>,email='alice@example.com')=>req(email,'/api/send',{id:crypto.randomUUID(),system_number:number,recipients:[peer],body:'מבצע',...b});
 const list=async()=>(await body(req('admin@example.com','/api/admin/senders'))).senders as {id:number;kind:string;value:string;label:string;status:string;users:string[]}[];
 const addPhone=async(code='12345')=>{await req('admin@example.com','/api/admin/senders/code',{phone:'03-555-1234'});return req('admin@example.com','/api/admin/senders/verify',{phone:'03-555-1234',code,desc:'מוקד'});};
 const assign=(id:number,users:string[],active=true)=>req('admin@example.com','/api/admin/senders/save',{id,label:'מוקד',active,users});
 const optout=(code:string,method='GET')=>redirect(new Request(base+'/x/'+code,{method}),env,()=>{});
 beforeEach(async()=>{calls.length=0;await env.DB.prepare("UPDATE user_numbers SET can_send=1 WHERE email='alice@example.com' AND system_number=?").bind(number).run();await env.DB.prepare("UPDATE users SET can_bulk_send=1 WHERE email='alice@example.com'").run();});
 it('is managed by admins only',async()=>{for(const [path,b] of [['/api/admin/senders',undefined],['/api/admin/senders/code',{phone:'03-555-1234'}],['/api/admin/senders/name',{name:'Noam'}],['/api/admin/senders/save',{id:1,active:true,users:[]}]] as const)expect((await req('alice@example.com',path,b)).status).toBe(403);
  expect(calls).toHaveLength(0);});
 it('verifies a number with the code Micropay sends to it',async()=>{
  expect(await body(req('admin@example.com','/api/admin/senders/code',{phone:'03-555-1234',type:'vms'}))).toEqual({sent:true});
  expect(calls[0]).toEqual({url:'https://www.micropay.co.il/extApi/senderVerify.php',body:{token:'t',phone:'035551234',type:'vms'}});expect(await list()).toEqual([]);
  expect(await body(req('admin@example.com','/api/admin/senders/verify',{phone:'035551234',code:'11111'}))).toEqual({error:'Wrong code'});
  expect(await body(req('admin@example.com','/api/admin/senders/verify',{phone:'035551234',code:'12345',desc:'מוקד'}))).toEqual({added:true});expect(calls.at(-1)!.body).toEqual({token:'t',phone:'035551234',code:'12345',desc:'מוקד'});
  expect(await list()).toMatchObject([{kind:'phone',value:'+97235551234',label:'מוקד',status:'verified',users:[]}]);
  expect((await req('admin@example.com','/api/admin/senders/code',{phone:'035551234'})).status).toBe(409);
  expect(await body(req('admin@example.com','/api/admin/senders/code',{phone:'0520000000'}))).toEqual({added:true});expect((await list()).map(x=>x.value)).toContain('+972520000000');
  expect((await req('admin@example.com','/api/admin/senders/code',{phone:'0530000000'})).status).toBe(429);
  expect(await body(req('admin@example.com','/api/admin/senders/code',{phone:'035551235'}))).toEqual({error:'Micropay refused: phone parameter, must be a valid Israeli phone'});
  for(const p of ['+447700900123','abc'])expect((await req('admin@example.com','/api/admin/senders/code',{phone:p})).status).toBe(400);
  expect((await req('admin@example.com','/api/admin/senders/code',{phone:'0541234567',type:'fax'})).status).toBe(400);
  const log=(await env.DB.prepare("SELECT action,target FROM audit_log WHERE action LIKE 'sender.%' ORDER BY id").all()).results;expect(log).toEqual([{action:'sender.code',target:'+97235551234'},{action:'sender.add',target:'+97235551234'},{action:'sender.add',target:'+972520000000'}]);});
 it('registers text sender names under Micropay\'s rules',async()=>{for(const n of ['N','TooLongName1','נועם','12345','Noam_Sys'])expect((await req('admin@example.com','/api/admin/senders/name',{name:n})).status).toBe(400);
  expect(await body(req('admin@example.com','/api/admin/senders/name',{name:'Noam Sys+',desc:'מבצעים'}))).toEqual({added:true});expect((await req('admin@example.com','/api/admin/senders/name',{name:'Noam Sys+'})).status).toBe(409);
  expect(await list()).toMatchObject([{kind:'name',value:'Noam Sys+',status:'unconfirmed'}]);});
 it('lets a user send only as the senders an admin assigned to them',async()=>{await addPhone();const id=(await list())[0].id;calls.length=0;
  expect(((await body(req('alice@example.com','/api/me'))).senders as unknown[])).toEqual([]);expect((await send({sender_id:id})).status).toBe(403);expect(calls).toHaveLength(0);
  expect((await assign(id,['alice@example.com'])).status).toBe(200);expect((await body(req('alice@example.com','/api/me'))).senders).toEqual([{id,kind:'phone',value:'+97235551234',label:'מוקד',status:'verified'}]);
  const sid=crypto.randomUUID();expect(await body(send({id:sid,sender_id:id}))).toMatchObject({status:'accepted',sent:1});expect(calls[0].body).toMatchObject({from:'035551234',list:'0509876543',msg:'מבצע'});
  expect(await env.DB.prepare("SELECT sender FROM messages WHERE direction='out'").first()).toEqual({sender:'+97235551234'});expect(await env.DB.prepare('SELECT sender_id FROM sends WHERE id=?').bind(sid).first()).toEqual({sender_id:id});
  expect((await read('alice@example.com','?direction=out')).messages[0].sender).toBe('+97235551234');
  // The user dialog sets the same permission from the user's side.
  const u=(await body(req('admin@example.com','/api/admin/users'))).users as {email:string;senders:number[]}[];expect(u.find(x=>x.email==='alice@example.com')!.senders).toEqual([id]);
  expect((await req('admin@example.com','/api/admin/users/save',{email:'alice@example.com',role:'user',active:true,can_bulk_send:true,daily_limit:null,numbers:[{number,can_send:true}],senders:[]})).status).toBe(200);
  expect((await send({sender_id:id})).status).toBe(403);
  expect((await req('admin@example.com','/api/admin/users/save',{email:'alice@example.com',role:'user',active:true,can_bulk_send:true,daily_limit:null,numbers:[{number,can_send:true}],senders:[id]})).status).toBe(200);expect((await send({sender_id:id})).status).toBe(200);
  await assign(id,['alice@example.com'],false);expect((await send({sender_id:id})).status).toBe(403);expect(((await body(req('admin@example.com','/api/me'))).senders as unknown[])).toEqual([]);
  expect((await send({sender_id:id},'admin@example.com')).status).toBe(403);await assign(id,[]);expect((await send({sender_id:id},'admin@example.com')).status).toBe(200);});
 it('refuses bot flows, and several recipients until the opt-out link text is set',async()=>{await addPhone();const id=(await list())[0].id;await assign(id,['alice@example.com']);calls.length=0;
  const flowId=(await body(req('admin@example.com','/api/admin/flows/save',{name:'סקר',system_number:number,trigger:'send',steps:[{id:'s1',type:'end',text:'שלום'}],fallback:'',expire_hours:24,active:true}))).id;
  expect(await body(send({sender_id:id,flow_id:flowId}))).toEqual({error:'A bot flow can only be sent from the system number'});
  expect((await send({sender_id:id,recipients:[peer,third]})).status).toBe(400);expect((await send({sender_id:id,test:true,bulk_preview:true})).status).toBe(400);
  expect((await req('admin@example.com','/api/admin/settings',{optout_link_text:'להסרה'})).status).toBe(400);
  await req('admin@example.com','/api/admin/settings',{optout_link_text:'להסרה: {קישור}'});expect((await send({sender_id:id,recipients:[peer,third]})).status).toBe(400);
  await req('admin@example.com','/api/admin/settings',{link_base:base});expect((await send({sender_id:id,recipients:[peer,third]})).status).toBe(200);expect(calls).toHaveLength(2);});
 it('gives each recipient their own opt-out link, which opts out only when confirmed',async()=>{await addPhone();const id=(await list())[0].id;calls.length=0;
  await req('admin@example.com','/api/admin/settings',{optout_link_text:'להסרה: {קישור}',optout_text:'להסרה השיבו הסר',link_base:base});
  expect(await body(send({sender_id:id,recipients:[peer,third]},'admin@example.com'))).toMatchObject({status:'accepted',sent:2});
  const codes=new Map((await env.DB.prepare('SELECT code,peer_number FROM optout_codes').all<{code:string;peer_number:string}>()).results.map(r=>[r.peer_number,r.code]));expect(codes.size).toBe(2);
  expect(calls.map(c=>c.body.msg).sort()).toEqual(['מבצע\r\nלהסרה: '+base+'/x/'+codes.get(peer),'מבצע\r\nלהסרה: '+base+'/x/'+codes.get(third)].sort());
  calls.length=0;await send({sender_id:id,recipients:[peer,third]},'admin@example.com');expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM optout_codes').first<{n:number}>())!.n).toBe(2);expect(calls.map(c=>String(c.body.msg)).join()).toContain('/x/'+codes.get(peer));
  // Without a sender ID the usual text is added, with no link.
  calls.length=0;await send({recipients:[peer,third]},'admin@example.com');expect(calls[0].body.msg).toBe('מבצע\r\nלהסרה השיבו הסר');
  const page=await optout(codes.get(peer)!);expect(page.status).toBe(200);const html=await page.text();expect(html).toContain('<form method="post">');expect(html).toContain('6543');expect(html).not.toContain('0509876543');
  expect(await env.DB.prepare('SELECT 1 FROM opt_outs').first()).toBeNull();expect((await optout(codes.get(peer)!,'HEAD')).status).toBe(200);expect(await env.DB.prepare('SELECT 1 FROM opt_outs').first()).toBeNull();
  expect((await optout(codes.get(peer)!,'POST')).status).toBe(200);expect(await env.DB.prepare('SELECT number,source FROM opt_outs').all()).toMatchObject({results:[{number:peer,source:'link'}]});
  expect(await (await optout(codes.get(peer)!)).text()).toContain('כבר הוסר');expect((await optout('ZZZZZZZ')).status).toBe(404);expect((await optout('ZZZZZZZ','POST')).status).toBe(404);
  calls.length=0;expect(await body(send({sender_id:id,recipients:[peer,third]},'admin@example.com'))).toMatchObject({sent:1,skipped:{opted_out:1}});
  calls.length=0;await req('admin@example.com','/api/admin/settings',{micropay_listjson:true});await send({sender_id:id,recipients:[third,'+972509876545']},'admin@example.com');
  expect(calls).toHaveLength(1);expect(calls[0].body.from).toBe('035551234');expect(Object.keys(calls[0].body.listjson as object)).toEqual(['0509876544','0509876545']);});
 it('confirms a text name by its first accepted send, or marks it rejected',async()=>{await req('admin@example.com','/api/admin/senders/name',{name:'NoamSys'});await req('admin@example.com','/api/admin/senders/name',{name:'BadName'});
  const ids=Object.fromEntries((await list()).map(x=>[x.value,x.id]));
  expect(await body(send({sender_id:ids.NoamSys},'admin@example.com'))).toMatchObject({status:'accepted'});expect(calls.at(-1)!.body.from).toBe('NoamSys');
  expect(await body(send({sender_id:ids.BadName},'admin@example.com'))).toMatchObject({status:'rejected'});
  expect(Object.fromEntries((await list()).map(x=>[x.value,x.status]))).toEqual({NoamSys:'confirmed',BadName:'rejected'});
  expect(((await body(req('admin@example.com','/api/me'))).senders as {value:string}[]).map(x=>x.value)).toEqual(['NoamSys']);expect((await send({sender_id:ids.BadName},'admin@example.com')).status).toBe(403);});
 it('checks the permission again when a scheduled send goes out',async()=>{await addPhone();const id=(await list())[0].id;await assign(id,['alice@example.com']);calls.length=0;
  expect(await body(send({sender_id:id,send_at:Date.now()+3600000}))).toMatchObject({scheduled:true});
  expect(((await body(req('alice@example.com','/api/scheduled'))).scheduled as {sender:string}[])[0].sender).toBe('+97235551234');
  await assign(id,[]);await env.DB.prepare('UPDATE scheduled_sends SET send_at=1').run();expect(await runScheduled({...env,MICROPAY_TOKEN:'t'},fetcher)).toBe(true);
  expect(calls).toHaveLength(0);const row=await env.DB.prepare('SELECT status,result FROM scheduled_sends').first<{status:string;result:string}>();expect(row!.status).toBe('failed');expect(JSON.parse(row!.result).error).toBe('This sender ID is not available to you');});
});
describe('links tab',()=>{
 const third='+972509876544',base='https://l.test',iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
 const fetcher=async()=>new Response('OK 1');
 const req=(email:string,path:string,b?:unknown)=>handle(new Request(ORIGIN+path,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:ORIGIN},body:JSON.stringify(b)}),{...env,MICROPAY_TOKEN:'t'} as Env,email,{fetcher}).catch(failure);
 async function open(path:string,agent=iphone){const pending:Promise<unknown>[]=[];const r=await redirect(new Request(base+'/'+path,{headers:{'User-Agent':agent}}),env,p=>pending.push(p));await Promise.all(pending);return r;}
 const groups=async()=>(await body(req('admin@example.com','/api/admin/links/groups'))).groups as {id:number;url:string;recipients:number;clicked:number;clicks:number;sent_url:string}[];
 const general=async()=>(await body(req('admin@example.com','/api/admin/links'))) as {base:string;links:{code:string;url:string;title:string;active:number;clicks:number;auto_clicks:number;days:{day:string;clicks:number}[]}[]};
 beforeEach(async()=>{await req('admin@example.com','/api/admin/settings',{link_base:base});});
 it('is for admins only',async()=>{for(const [path,b] of [['/api/admin/links',undefined],['/api/admin/links/groups',undefined],['/api/admin/links/create',{url:'https://a.example.com'}],['/api/admin/links/groups/save',{id:1,url:'https://a.example.com'}]] as const)expect((await req('alice@example.com',path,b)).status).toBe(403);});
 it('lists sent links per send and changes where all of a send\'s links lead',async()=>{
  await req('admin@example.com','/api/send',{id:crypto.randomUUID(),system_number:number,recipients:[peer,third],body:'מבצע https://shop.example.com/old',track_links:true});
  await env.DB.prepare('UPDATE links SET created_at=created_at-60000').run();
  let g=await groups();expect(g).toMatchObject([{url:'https://shop.example.com/old',recipients:2,clicked:0,clicks:0,sent_url:'https://shop.example.com/old'}]);
  const code=(await env.DB.prepare('SELECT code FROM links WHERE peer_number=?').bind(peer).first<{code:string}>())!.code;
  expect((await open(code)).headers.get('location')).toBe('https://shop.example.com/old');await env.DB.prepare('UPDATE links SET last_click_at=last_click_at-60000').run();await open(code);await open(code,'facebookexternalhit/1.1');
  expect((await groups())[0]).toMatchObject({clicked:1,clicks:2});
  for(const u of ['shop.example.com','javascript:alert(1)','https://a b.com'])expect((await req('admin@example.com','/api/admin/links/groups/save',{id:g[0].id,url:u})).status).toBe(400);
  expect((await req('admin@example.com','/api/admin/links/groups/save',{id:g[0].id,url:'https://shop.example.com/new'})).status).toBe(200);
  expect((await open(code)).headers.get('location')).toBe('https://shop.example.com/new');
  const other=(await env.DB.prepare('SELECT code FROM links WHERE peer_number=?').bind(third).first<{code:string}>())!.code;expect((await open(other)).headers.get('location')).toBe('https://shop.example.com/new');
  g=await groups();expect(g[0]).toMatchObject({url:'https://shop.example.com/new',sent_url:'https://shop.example.com/old',clicked:2});
  // The last tap came within 30 seconds of the one before, so it was not counted again.
  expect((await env.DB.prepare('SELECT clicks FROM messages WHERE peer_number=?').bind(peer).first())).toEqual({clicks:2});
  expect(await env.DB.prepare("SELECT target,details FROM audit_log WHERE action='link.group'").first()).toEqual({target:String(g[0].id),details:JSON.stringify({from:'https://shop.example.com/old',url:'https://shop.example.com/new',recipients:2})});});
 it('keeps the batches of one send in one row',async()=>{const first=crypto.randomUUID();
  for(const [id,to] of [[first,[peer]],[crypto.randomUUID(),[third]]] as const)expect((await req('admin@example.com','/api/send',{id,system_number:number,recipients:to,body:'https://a.example.com and https://b.example.com',track_links:true,bulk:true,batch_of:first})).status).toBe(200);
  expect((await groups()).map(x=>[x.url,x.recipients]).sort()).toEqual([['https://a.example.com',2],['https://b.example.com',2]]);
  expect((await req('admin@example.com','/api/send',{id:crypto.randomUUID(),system_number:number,recipients:[peer],body:'https://a.example.com',track_links:true,batch_of:'nope'})).status).toBe(400);
  await env.DB.prepare('DELETE FROM link_groups').run();const many=Array.from({length:35},(_,i)=>'05090000'+String(i).padStart(2,'0'));
  await req('admin@example.com','/api/send',{id:crypto.randomUUID(),system_number:number,recipients:many,body:'https://c.example.com',track_links:true,send_at:Date.now()+3600000});
  await env.DB.prepare('UPDATE scheduled_sends SET send_at=1').run();await runScheduled({...env,MICROPAY_TOKEN:'t'},fetcher);await runScheduled({...env,MICROPAY_TOKEN:'t'},fetcher);
  expect((await groups()).map(x=>[x.url,x.recipients])).toEqual([['https://c.example.com',35]]);});
 it('creates general links with a chosen or random name, and edits, turns off and deletes them',async()=>{
  const random=await body(req('admin@example.com','/api/admin/links/create',{url:'https://example.com/a',title:'פייסבוק'}));expect(random.code).toMatch(/^[a-z0-9]{7}$/);
  expect(await body(req('admin@example.com','/api/admin/links/create',{url:'https://example.com/sale',name:'Sale'}))).toEqual({code:'sale'});
  for(const n of ['sale','api','www'])expect((await req('admin@example.com','/api/admin/links/create',{url:'https://example.com',name:n})).status).toBe(409);
  for(const n of ['a','x','-sale','sale-','מבצע','sale!','a'.repeat(41)])expect((await req('admin@example.com','/api/admin/links/create',{url:'https://example.com',name:n})).status).toBe(400);
  expect((await req('admin@example.com','/api/admin/links/create',{url:'ftp://example.com'})).status).toBe(400);
  await env.DB.prepare("INSERT INTO links (code,send_id,system_number,peer_number,url,created_at) VALUES ('abcdefg','s',?,?,'https://x.example.com',1)").bind(number,peer).run();
  expect((await req('admin@example.com','/api/admin/links/create',{url:'https://example.com',name:'abcdefg'})).status).toBe(409);
  for(const p of ['sale','SALE','sale.'])expect((await open(p)).headers.get('location')).toBe('https://example.com/sale');
  await open('sale','curl/8.0');expect((await general()).links.find(l=>l.code==='sale')).toMatchObject({clicks:3,auto_clicks:1,days:[{clicks:3}]});
  expect((await open(random.code as string)).headers.get('location')).toBe('https://example.com/a');
  expect((await req('admin@example.com','/api/admin/links/save',{code:'sale',url:'https://example.com/sale2',title:'מבצע',active:true})).status).toBe(200);expect((await open('sale')).headers.get('location')).toBe('https://example.com/sale2');
  await req('admin@example.com','/api/admin/links/save',{code:'sale',url:'https://example.com/sale2',title:'מבצע',active:false});const off=await open('sale');expect(off.status).toBe(410);expect(off.headers.get('location')).toBeNull();
  expect((await general()).links.find(l=>l.code==='sale')).toMatchObject({clicks:4,active:0,title:'מבצע'});
  expect((await req('admin@example.com','/api/admin/links/delete',{code:'sale'})).status).toBe(200);expect((await open('sale')).status).toBe(404);expect(await env.DB.prepare("SELECT 1 FROM short_link_days WHERE code='sale'").first()).toBeNull();
  expect((await general()).base).toBe(base);expect((await open('nothere')).status).toBe(404);
  expect((await env.DB.prepare("SELECT action,target FROM audit_log WHERE action LIKE 'link.%' ORDER BY id").all()).results.map(r=>(r as {action:string}).action)).toEqual(['link.create','link.create','link.update','link.update','link.delete']);});
});
describe('first question sent from another system',()=>{
 const steps=[{id:'s1',type:'options',text:'מה מעניין אותך? 1 דירה 2 משרד 3 אחר',options:[{reply:'1',meaning:'דירה',next:'s2'},{reply:'2',meaning:'משרד',next:'s2'},{reply:'3',meaning:'אחר',next:'s2'}]},
  {id:'s2',type:'text',text:'מה השם?',field:'name',next:'s3'},{id:'s3',type:'end',text:'תודה!'}];
 const flow=(b:Record<string,unknown>={})=>api('admin@example.com','/api/admin/flows/save',{name:'ליד',system_number:number,trigger:'external',steps,fallback:'',expire_hours:24,active:true,...b});
 let n=0;const say=async(text:string,from='0509876543')=>{const r=await ingest(callback('json',{origsms:text,msgid:'e'+(++n),phone:from}),env);expect(r.status).toBe(200);return (JSON.parse(await r.text()) as {reply:string}).reply;};
 const note=async(text:string)=>{const r=await env.DB.prepare("SELECT bot FROM messages WHERE direction='in' AND body=? ORDER BY id DESC").bind(text).first<{bot:string|null}>();return r?.bot?JSON.parse(r.bot):null;};
 it('reads a customer\'s first message as the answer to the first question, and goes on from there',async()=>{const id=(await body(flow())).id as number;
  expect(await say('1')).toBe('מה השם?');expect(await note('1')).toEqual({flow:id,step:'s1',match:'option',external:true});
  expect(await say('דנה')).toBe('תודה!');
  expect((await env.DB.prepare('SELECT step,answer,meaning FROM bot_answers ORDER BY id').all()).results).toEqual([{step:'s1',answer:'1',meaning:'דירה'},{step:'s2',answer:'דנה',meaning:null}]);
  expect(await env.DB.prepare('SELECT flow_id FROM bot_threads WHERE peer_number=?').bind(peer).first()).toEqual({flow_id:id});
  // Once (the default): a customer who went through it is not read as answering again.
  expect(await say('2')).toBe('');expect(await note('2')).toBeNull();expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM bot_answers').first<{n:number}>())!.n).toBe(2);
  expect((await flow({id,repeat_mode:'always'})).status).toBe(200);expect(await say('3')).toBe('מה השם?');});
 it('asks the first question itself when the answer is not recognized, then gives up as usual',async()=>{const id=(await body(flow())).id as number;
  expect(await say('שלום, קיבלתי הודעה')).toBe('לא זיהינו את התשובה.\nמה מעניין אותך? 1 דירה 2 משרד 3 אחר');
  expect(await note('שלום, קיבלתי הודעה')).toEqual({flow:id,step:'s1',match:'none',retry:1,external:true});expect(await env.DB.prepare('SELECT step,retries FROM conversations').first()).toEqual({step:'s1',retries:1});
  expect(await say('7')).toBe('לא זיהינו את התשובה.\nמה מעניין אותך? 1 דירה 2 משרד 3 אחר');expect(await say('לא יודע')).toBe('');
  expect(await note('לא יודע')).toEqual({flow:id,step:'s1',match:'none',gave_up:true});expect(await env.DB.prepare('SELECT 1 FROM conversations').first()).toBeNull();
  expect(await say('1')).toBe('');
  expect(await say('2','0521234567')).toBe('מה השם?');});
 it('lets a keyword flow go first and leaves opted-out and blocked customers alone',async()=>{await flow();
  await api('admin@example.com','/api/admin/flows/save',{name:'מבצע',system_number:number,trigger:'keyword',keyword:'מבצע',steps:[{id:'s1',type:'end',text:'פרטי המבצע'}],fallback:'',expire_hours:24,active:true});
  expect(await say('מבצע')).toBe('פרטי המבצע');expect(await say('1')).toBe('מה השם?');
  await env.DB.prepare("INSERT INTO opt_outs (number,source,created_at) VALUES ('+972521234567','manual',1)").run();expect(await say('1','0521234567')).toBe('');
  await env.DB.prepare("INSERT INTO bot_blocks (system_number,peer_number,created_at,created_by) VALUES (?,'+972546667788',1,'x')").bind(number).run();expect(await say('1','0546667788')).toBe('');
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM flow_customers").first()).toEqual({n:1});});
 it('validates: one flow per number answers every message, and the first step must ask something',async()=>{expect((await flow()).status).toBe(200);
  expect((await api('admin@example.com','/api/admin/flows/save',{name:'כל הודעה',system_number:number,trigger:'any',steps,fallback:'',expire_hours:24,active:true})).status).toBe(409);
  expect((await flow({name:'עוד אחד'})).status).toBe(409);expect((await flow({name:'כבוי',active:false})).status).toBe(200);
  expect((await flow({name:'סוף',active:false,steps:[{id:'s1',type:'end',text:'תודה'}]})).status).toBe(400);expect((await flow({name:'x',active:false,repeat_mode:'sometimes'})).status).toBe(400);
  const f=((await body(api('admin@example.com','/api/admin/flows'))).flows as {name:string;trigger:string;repeat_mode:string}[]).find(x=>x.name==='ליד')!;expect(f).toMatchObject({trigger:'external',repeat_mode:'once'});});
});

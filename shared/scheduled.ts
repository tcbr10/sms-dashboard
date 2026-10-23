import {Env,HttpError} from './validation';
import {Fetch} from './micropay-send';
import {Sender,executeSend,prepareSend} from './dispatch';
// Scheduled sends wait in D1 and are sent by the ingest Worker's every-minute timer through the same code as the
// send button. Each run sends one batch of one due send: the whole send, or for personalized sends without listjson
// a batch small enough for the free plan's 50 outgoing calls per invocation (forwarding retries share that budget).
const CRON_PERSONAL_BATCH = 30;
type Row = {id:string;email:string;system_number:string;body:string;recipients:string;invalid:number;duplicates:number;flow_id:number|null;stop_bot:number;track_links:number;sender_id:number|null;progress:number;result:string|null};
export type Totals = {sent:number;accepted:number;rejected:number;unknown:number;opted_out:number;error?:string};
// Returns true when it worked on a send, so the caller can leave forwarding retries for the next minute.
export async function runScheduled(env: Env, fetcher: Fetch): Promise<boolean> {
 const now = Date.now();
 const due = await env.DB.prepare("SELECT id FROM scheduled_sends WHERE status='scheduled' AND send_at<=? AND (locked_until IS NULL OR locked_until<?) ORDER BY send_at LIMIT 1").bind(now,now).first<{id:string}>();
 if (!due) return false;
 // The lock stops a second run from sending the same batch; it expires if this run dies.
 const row = await env.DB.prepare("UPDATE scheduled_sends SET locked_until=? WHERE id=? AND status='scheduled' AND (locked_until IS NULL OR locked_until<?) RETURNING id,email,system_number,body,recipients,invalid,duplicates,flow_id,stop_bot,track_links,sender_id,progress,result").bind(now+180000,due.id,now).first<Row>();
 if (!row) return false;
 const totals: Totals = row.result ? JSON.parse(row.result) : {sent:0,accepted:0,rejected:0,unknown:0,opted_out:0};
 try {
  const token = env.MICROPAY_TOKEN; if (!token) throw new HttpError(503,'MICROPAY_TOKEN is not set on the ingest Worker');
  const sender = await env.DB.prepare('SELECT email,role,can_bulk_send,daily_limit FROM users WHERE email=? AND active=1').bind(row.email).first<Sender>();
  if (!sender) throw new HttpError(403,'The user who scheduled this send is no longer active');
  const all = JSON.parse(row.recipients) as string[];
  const p = await prepareSend(env,sender,{system_number:row.system_number,body:row.body,recipients:[],flow_id:row.flow_id,stop_bot:!!row.stop_bot,track_links:!!row.track_links,sender_id:row.sender_id,bulk:all.length > 1},{recipients:all,invalid:row.invalid,duplicates:row.duplicates});
  const size = (p.personal || p.track || (!!p.from && all.length > 1)) && !p.settings.micropay_listjson ? CRON_PERSONAL_BATCH : all.length; const batch = all.slice(row.progress,row.progress+size);
  try {
   const o = await executeSend(env,fetcher,token,row.id+':'+row.progress,sender,p,batch,'sms-dashboard scheduled '+sender.email);
   if (!o.duplicate) { totals.sent += o.sent; totals.accepted += o.counts.accepted; totals.rejected += o.counts.rejected; totals.unknown += o.counts.unknown; totals.opted_out += o.skipped.opted_out; }
   if (o.status === 'rejected' && !o.duplicate) throw new HttpError(502,'Micropay rejected the send'+(o.error ? ': '+o.error : ''));
  } catch (e) { if (!(e instanceof HttpError && e.message === 'No valid recipients left to send to')) throw e; totals.opted_out += batch.length; }
  const progress = row.progress + batch.length; const done = progress >= all.length;
  await env.DB.prepare("UPDATE scheduled_sends SET status=?,progress=?,locked_until=NULL,result=?,updated_at=? WHERE id=?").bind(done ? 'sent' : 'scheduled',progress,JSON.stringify(totals),Date.now(),row.id).run();
 } catch (e) {
  totals.error = (e instanceof Error ? e.message : 'Send failed').slice(0,300);
  await env.DB.prepare("UPDATE scheduled_sends SET status='failed',locked_until=NULL,result=?,updated_at=? WHERE id=?").bind(JSON.stringify(totals),Date.now(),row.id).run();
 }
 return true;
}

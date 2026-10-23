import {Env} from './validation';
import {loadSettings} from './settings';
import {hasVariables,render} from './template';
// Auto-reply flows. A conversation (system number + customer) remembers its current step, so the same reply ("1") is
// read against the options of whichever question was asked last. Replies go out as the answer to Micropay's
// incoming-SMS webhook, so they need no API call and come from the same number.
export type Option = {reply:string;meaning:string;next:string};
export type Step = {id:string;text:string;type:'options'|'text'|'end';options?:Option[];next?:string;field?:string};
export type Flow = {id:number;name:string;system_number:string;trigger:'any'|'keyword'|'send';keyword:string|null;steps:Step[];fallback:string;expire_hours:number;active:number};
type Conversation = {flow_id:number;step:string;retries:number;expires_at:number};
export const DEFAULT_FALLBACK = 'לא זיהינו את התשובה.';
const MAX_RETRIES = 2; // an unrecognized reply repeats the question twice, then the conversation ends
export const BOT_SENDER = 'בוט';

// Replies match ignoring case, spaces and surrounding punctuation; an option may list several replies separated by commas.
export function normalizeReply(s: string): string { return s.trim().replace(/^[\s.,!?"'״׳()-]+|[\s.,!?"'״׳()-]+$/g, '').replace(/\s+/g, ' ').toLowerCase(); }
export function matchOption(step: Step, body: string): Option|undefined { const t = normalizeReply(body); return t ? step.options?.find(o => o.reply.split(',').map(normalizeReply).filter(Boolean).includes(t)) : undefined; }
export function parseFlow(row: Omit<Flow,'steps'> & {steps:string}): Flow { return {...row, steps:JSON.parse(row.steps) as Step[]}; }

export async function loadFlow(env: Env, id: number): Promise<Flow|null> { const r = await env.DB.prepare('SELECT * FROM flows WHERE id=?').bind(id).first<Omit<Flow,'steps'> & {steps:string}>(); return r ? parseFlow(r) : null; }
// Starts (or restarts) a conversation at a step and returns the text to send; an "end" step is sent without one.
export function enter(env: Env, flow: Flow, step: Step, system: string, peer: string, now: number): D1PreparedStatement {
 return step.type === 'end'
  ? env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number=?').bind(system, peer)
  : env.DB.prepare('INSERT INTO conversations (system_number,peer_number,flow_id,step,retries,started_at,updated_at,expires_at) VALUES (?,?,?,?,0,?,?,?) ON CONFLICT(system_number,peer_number) DO UPDATE SET flow_id=excluded.flow_id,step=excluded.step,retries=0,updated_at=excluded.updated_at,expires_at=excluded.expires_at,started_at=CASE WHEN conversations.flow_id=excluded.flow_id THEN conversations.started_at ELSE excluded.started_at END').bind(system, peer, flow.id, step.id, now, now, now + flow.expire_hours * 3600000);
}
// The same for many customers at once (a dashboard send that starts a flow), in one statement.
export function enterMany(env: Env, flow: Flow, step: Step, system: string, peers: string[], now: number): D1PreparedStatement {
 return step.type === 'end'
  ? env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number IN (SELECT value FROM json_each(?))').bind(system, JSON.stringify(peers))
  : env.DB.prepare('INSERT INTO conversations (system_number,peer_number,flow_id,step,retries,started_at,updated_at,expires_at) SELECT ?1,value,?2,?3,0,?4,?4,?5 FROM json_each(?6) WHERE true ON CONFLICT(system_number,peer_number) DO UPDATE SET flow_id=excluded.flow_id,step=excluded.step,retries=0,started_at=excluded.started_at,updated_at=excluded.updated_at,expires_at=excluded.expires_at').bind(system, flow.id, step.id, now, now + flow.expire_hours * 3600000, JSON.stringify(peers));
}
// Bot chat threads (one per customer and number) list the bot's conversations on the chats page. A thread opens when
// a flow starts and is touched by every later message, so the list can be read and live-updated by update time
// alone. updated_at only moves forward, even within one millisecond, so live updates never miss a change.
export function openThreads(env: Env, system: string, peers: string[], flowId: number|null, now: number): D1PreparedStatement {
 return env.DB.prepare('INSERT INTO bot_threads (system_number,peer_number,flow_id,started_at,last_at,updated_at) SELECT ?1,value,?2,?3,?3,?3 FROM json_each(?4) WHERE true ON CONFLICT(system_number,peer_number) DO UPDATE SET flow_id=COALESCE(excluded.flow_id,bot_threads.flow_id),last_at=MAX(bot_threads.last_at,excluded.last_at),updated_at=MAX(excluded.updated_at,bot_threads.updated_at+1)').bind(system, flowId, now, JSON.stringify(peers));
}
// For customers who already have a thread: a new message or a change of bot state. Others are left alone.
export function touchThreads(env: Env, system: string, peers: string[], at: number, now: number): D1PreparedStatement {
 return env.DB.prepare('UPDATE bot_threads SET last_at=MAX(last_at,?1),updated_at=MAX(?2,updated_at+1) WHERE system_number=?3 AND peer_number IN (SELECT value FROM json_each(?4))').bind(at, now, system, JSON.stringify(peers));
}
// What the bot did with a message, kept on the message (messages.bot) for the chats page. On a customer's message:
// {flow,step,match:'option'|'text'|'none',retry?,gave_up?} for an answer to the question of that step, or {start}
// when it started a flow. On the bot's own message: {flow,step} for the question it asks, with retry, start or end.
export type BotNote = {flow?:number;step?:string;match?:'option'|'text'|'none';retry?:number;gave_up?:boolean;start?:number|boolean;end?:boolean};

// Saves an answer to a contact field, merging with the contact's other fields.
function saveField(env: Env, peer: string, field: string, value: string, now: number): D1PreparedStatement {
 return env.DB.prepare("INSERT INTO contacts (number,data,updated_at,updated_by) VALUES (?1,json_object(?2,?3),?4,'bot') ON CONFLICT(number) DO UPDATE SET data=json_set(contacts.data,'$.'||?2,?3),updated_at=?4,updated_by='bot'").bind(peer, field, value.trim().slice(0, 200), now);
}

// Decides the bot's reply to a newly stored incoming message (or null for none) and records the answer and new state.
// A repeated webhook call for the same message returns the reply already sent, without moving the conversation.
// status is how the reply is logged: 'accepted' when it goes back as the webhook's answer, 'pending' when the caller
// sends it through Micropay's API afterwards.
export async function handleIncoming(env: Env, m: {id:number;inserted:boolean;system:string;peer:string;body:string}, status: 'accepted'|'pending' = 'accepted'): Promise<string|null> {
 const key = JSON.stringify(['out', 'bot:' + m.id]);
 if (!m.inserted) return (await env.DB.prepare('SELECT body FROM messages WHERE event_key=?').bind(key).first<{body:string}>())?.body ?? null;
 const now = Date.now();
 const [optedOut, blocked, conv] = await Promise.all([
  env.DB.prepare('SELECT 1 FROM opt_outs WHERE number=?').bind(m.peer).first(),
  env.DB.prepare('SELECT 1 FROM bot_blocks WHERE system_number=? AND peer_number=?').bind(m.system, m.peer).first(),
  env.DB.prepare('SELECT flow_id,step,retries,expires_at FROM conversations WHERE system_number=? AND peer_number=?').bind(m.system, m.peer).first<Conversation>(),
 ]);
 const end = env.DB.prepare('DELETE FROM conversations WHERE system_number=? AND peer_number=?').bind(m.system, m.peer);
 if (optedOut || blocked) { if (conv) await end.run(); return null; }
 const writes: D1PreparedStatement[] = []; let reply: string|null = null; let heard: BotNote|null = null; let said: BotNote|null = null;
 const flow = conv && conv.expires_at > now ? await loadFlow(env, conv.flow_id) : null;
 const step = flow?.active ? flow.steps.find(s => s.id === conv!.step) : undefined;
 if (flow && step && conv && step.type !== 'end') {
  const option = step.type === 'options' ? matchOption(step, m.body) : undefined;
  if (step.type === 'options' && !option) {
   const retry = conv.retries + 1; heard = {flow:flow.id,step:step.id,match:'none',...(conv.retries < MAX_RETRIES ? {retry} : {gave_up:true})};
   if (conv.retries < MAX_RETRIES) { reply = (flow.fallback || DEFAULT_FALLBACK) + '\n' + step.text; said = {flow:flow.id,step:step.id,retry}; writes.push(env.DB.prepare('UPDATE conversations SET retries=retries+1,updated_at=?,expires_at=? WHERE system_number=? AND peer_number=?').bind(now, now + flow.expire_hours * 3600000, m.system, m.peer)); }
   else writes.push(end);
  } else {
   const meaning = option ? option.meaning || option.reply : null; heard = {flow:flow.id,step:step.id,match:option ? 'option' : 'text'};
   writes.push(env.DB.prepare('INSERT INTO bot_answers (flow_id,system_number,peer_number,step,question,answer,meaning,message_id,at) VALUES (?,?,?,?,?,?,?,?,?)').bind(flow.id, m.system, m.peer, step.id, step.text, m.body.slice(0, 1000), meaning, m.id, now));
   if (step.field) writes.push(saveField(env, m.peer, step.field, meaning ?? m.body, now));
   const next = flow.steps.find(s => s.id === (option ? option.next : step.next));
   if (next) { reply = next.text; said = {flow:flow.id,step:next.id,...(next.type === 'end' ? {end:true} : {})}; writes.push(enter(env, flow, next, m.system, m.peer, now)); } else writes.push(end);
  }
 } else {
  if (conv) writes.push(end);
  // A keyword flow whose keyword is the whole message or its first word wins over a flow that answers any message.
  const flows = (await env.DB.prepare("SELECT * FROM flows WHERE system_number=? AND active=1 AND trigger IN ('any','keyword')").bind(m.system).all<Omit<Flow,'steps'> & {steps:string}>()).results.map(parseFlow);
  const text = normalizeReply(m.body), first = text.split(' ')[0];
  const start = flows.find(f => f.trigger === 'keyword' && f.keyword && [text, first].includes(normalizeReply(f.keyword))) ?? flows.find(f => f.trigger === 'any');
  if (start?.steps.length) { reply = start.steps[0].text; heard = {start:start.id}; said = {flow:start.id,step:start.steps[0].id,start:true,...(start.steps[0].type === 'end' ? {end:true} : {})}; writes.push(enter(env, start, start.steps[0], m.system, m.peer, now)); }
 }
 if (heard) writes.push(env.DB.prepare('UPDATE messages SET bot=?,updated_at=MAX(?,updated_at+1) WHERE id=?').bind(JSON.stringify(heard), now, m.id));
 // The thread opens when a flow starts; a conversation that moved or ended also changes the thread's state. It is
 // written after the reply, so a thread that shows as changed already has its latest message.
 const threadFlow = heard?.flow ?? (typeof heard?.start === 'number' ? heard.start : null);
 const thread = threadFlow !== null ? openThreads(env, m.system, [m.peer], threadFlow, now) : conv ? touchThreads(env, m.system, [m.peer], now, now) : null;
 // State and answers are written first, so variables in the reply ({שם}…) see an answer this step just saved.
 if (writes.length) await env.DB.batch(writes);
 if (reply && hasVariables(reply)) { const [settings,contact] = await Promise.all([loadSettings(env.DB),env.DB.prepare('SELECT data FROM contacts WHERE number=?').bind(m.peer).first<{data:string}>()]); reply = render(reply,settings.contact_fields,contact ? JSON.parse(contact.data) : null,m.peer) || null; }
 // The reply is logged as an outgoing message from the bot.
 const logged = reply ? env.DB.prepare("INSERT INTO messages (event_key,direction,system_number,peer_number,body,occurred_at,received_at,time_source,submission_status,updated_at,sent_by,bot) VALUES (?,'out',?,?,?,?,?,'workflow',?,?,?,?) ON CONFLICT(event_key) DO NOTHING").bind(key, m.system, m.peer, reply, now, now, status, now, BOT_SENDER, said ? JSON.stringify(said) : null) : null;
 const after = [logged, thread].filter((x): x is D1PreparedStatement => x !== null); if (after.length) await env.DB.batch(after);
 return reply;
}

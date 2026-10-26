import {header,shell,svg} from './ui';
// Bot chats page: the bot's conversations as chats. A list of threads (chats.ts), the chosen conversation's messages
// (from /api/messages, with what the bot made of each reply) and a side panel with its bot state and answers.
const css = String.raw`
.chats{display:grid;grid-template-columns:320px minmax(0,1fr) 300px;height:calc(100dvh - var(--top,61px));min-height:480px}
.c-list,.c-thread,.c-side{display:flex;flex-direction:column;min-height:0;background:var(--surface)}
.c-list{border-inline-end:1px solid var(--line)}
.c-side{border-inline-start:1px solid var(--line);overflow-y:auto;padding:14px;gap:18px}
.c-tools{display:flex;flex-direction:column;gap:10px;padding:12px;border-bottom:1px solid var(--line)}
.c-tools .search{flex:none;max-width:none}
@media (min-width:1101px){.chats:not(.has-thread){grid-template-columns:320px minmax(0,1fr)}}
.chats:not(.has-thread) .c-side{display:none}
.c-states{display:flex;flex-wrap:wrap;gap:6px}
.c-states button{height:30px;padding:0 11px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink2);font-size:12.5px;cursor:pointer}
.c-states button[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--ink)}
.c-items{list-style:none;margin:0;padding:6px;overflow-y:auto;flex:1}
.c-item{display:flex;gap:10px;width:100%;padding:10px;border:0;border-radius:10px;background:transparent;text-align:start;cursor:pointer}
.c-item:hover{background:var(--hover)}
.c-item[aria-current=true]{background:color-mix(in srgb,var(--accent) 13%,transparent)}
.avatar{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--ink);font-weight:600;font-size:14px}
.c-main{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.c-row{display:flex;align-items:baseline;gap:8px}
.c-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-time{margin-inline-start:auto;font-size:12px;color:var(--muted);white-space:nowrap}
.c-last{font-size:13px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);min-width:0}
.c-meta span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.state-dot{width:8px;height:8px;flex:none;border-radius:50%;background:var(--neutral)}
.state-dot.active{background:var(--good)}.state-dot.blocked,.state-dot.opted_out{background:var(--bad)}
.c-more{margin:6px auto 10px}
.t-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)}
.t-who{display:flex;flex-direction:column;min-width:0}
.t-who strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-acts{display:flex;flex-wrap:wrap;gap:4px;margin-inline-start:auto}
.t-back,.t-info{display:none}
.t-body{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px;background:var(--page)}
.day{align-self:center;padding:2px 12px;border-radius:999px;background:var(--hover);font-size:12px;color:var(--muted)}
.msg{display:flex;flex-direction:column;gap:4px;max-width:min(560px,78%)}
.msg.in{align-self:flex-start;align-items:flex-start}
.msg.out{align-self:flex-end;align-items:flex-end}
.bubble{padding:8px 12px;border-radius:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--line);background:var(--surface)}
.msg.in .bubble{border-start-start-radius:4px}
.msg.out .bubble{border-start-end-radius:4px;border-color:transparent;background:color-mix(in srgb,var(--good) 15%,var(--surface))}
.msg.bot .bubble{background:color-mix(in srgb,var(--accent) 15%,var(--surface))}
.who-line{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted)}
.who-line .i{width:14px;height:14px;color:var(--accent)}
.m-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.opts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.opt-chip{padding:2px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px;color:var(--ink2)}
.opt-chip.on{border-color:color-mix(in srgb,var(--good) 45%,transparent);background:color-mix(in srgb,var(--good) 15%,transparent);color:var(--ink)}
.note{padding:1px 8px;border-radius:999px;font-size:12px;background:var(--hover);color:var(--ink2)}
.note.good{background:color-mix(in srgb,var(--good) 15%,transparent);color:var(--ink)}
.note.warn{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--ink)}
.note.bad{background:color-mix(in srgb,var(--bad) 15%,transparent);color:var(--ink)}
.note.accent{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--ink)}
.t-form{display:flex;flex-direction:column;gap:8px;padding:10px 14px;border-top:1px solid var(--line)}
.t-form .row{display:flex;gap:10px;align-items:flex-end}
.t-form textarea{flex:1;min-height:44px;resize:none}
.t-form .btn{height:44px}
.t-form .hint{display:flex;flex-wrap:wrap;gap:12px}
.t-empty{flex:1;display:grid;place-items:center}
.side h2{margin:0 0 8px;font-size:13px;font-weight:600;color:var(--muted)}
.facts{display:grid;gap:6px}
.facts div{display:flex;justify-content:space-between;gap:10px;font-size:13.5px}
.facts span:first-child{color:var(--muted)}
.state-box{padding:10px 12px;border-radius:10px;background:var(--hover);font-size:13.5px;display:grid;gap:4px}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.steps li{display:grid;gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;font-size:13.5px}
.steps li.now{border-color:var(--accent)}
.steps .q{font-size:12px;color:var(--muted);white-space:pre-wrap}
.flow-name{font-size:12px;font-weight:600;color:var(--ink2);margin-top:4px}
@media (max-width:1100px){.chats{grid-template-columns:300px minmax(0,1fr)}.c-side{display:none}.chats.side-open .c-side{display:flex;position:fixed;inset-block:0;inset-inline-end:0;width:min(340px,92vw);z-index:20;box-shadow:0 0 40px rgba(0,0,0,.25)}.t-info{display:inline-flex}}
@media (max-width:720px){.chats{grid-template-columns:minmax(0,1fr)}.chats.has-thread .c-list{display:none}.chats:not(.has-thread) .c-thread{display:none}.t-back{display:inline-flex}.msg{max-width:88%}}
`;
const body = header('chats',true) + String.raw`
<main class="chats" id="chats">
 <aside class="c-list" aria-label="שיחות בוט">
  <div class="c-tools">
   <label class="search field">`+svg('search')+String.raw`<input type="search" id="q" placeholder="חיפוש לפי מספר או פרטי לקוח" aria-label="חיפוש שיחות" maxlength="200"></label>
   <div class="c-states" id="states" role="group" aria-label="סינון לפי מצב"></div>
   <label class="row hint">תהליך<select id="flow" class="field"><option value="">כל התהליכים</option></select></label>
   <div class="row hint"><span>הודעות מאז</span><input type="date" id="from-d" class="field" aria-label="תאריך התחלה"><input type="time" id="from-t" class="field" aria-label="שעת התחלה"><button type="button" class="ghost" id="from-clear" hidden>ניקוי</button></div>
   <div class="row"><button type="button" class="ghost" id="export-xlsx">`+svg('download')+String.raw`ייצוא Excel</button><button type="button" class="ghost" id="export-csv">ייצוא CSV</button></div>
   <p class="hint" id="export-note" hidden></p>
  </div>
  <div class="skeleton" id="skeleton"><div></div><div></div><div></div></div>
  <ul class="c-items" id="items"></ul>
  <div class="empty" id="list-empty" hidden>`+svg('bot-on')+String.raw`<p class="empty-title" id="list-empty-title"></p><p class="hint" id="list-empty-sub"></p></div>
  <button type="button" class="ghost c-more" id="more" hidden>טעינת שיחות נוספות</button>
 </aside>
 <section class="c-thread" aria-label="שיחה" id="thread">
  <div class="t-empty" id="t-none"><div class="empty">`+svg('chat')+String.raw`<p class="empty-title">בחרו שיחה מהרשימה</p><p class="hint">כאן מוצגת השיחה עם הבוט, עם מה שהבוט הבין מכל תשובה.</p></div></div>
  <div class="t-head" id="t-head" hidden>
   <button type="button" class="ghost t-back" id="t-back" aria-label="חזרה לרשימה">`+svg('send')+String.raw`</button>
   <span class="avatar" id="t-avatar"></span>
   <div class="t-who"><strong id="t-name"></strong><span class="hint phone" id="t-phone"></span></div>
   <span class="tag" id="t-state"></span>
   <div class="t-acts">
    <a class="ghost" id="t-table">`+svg('columns')+String.raw`פתיחה בטבלה</a>
    <button type="button" class="ghost" id="t-bot"></button>
    <button type="button" class="ghost t-info" id="t-info">פרטי השיחה</button>
   </div>
  </div>
  <div class="t-body" id="t-body" aria-live="polite" hidden></div>
  <form class="t-form" id="t-form" hidden novalidate>
   <div class="row"><textarea id="t-text" rows="2" maxlength="1000" aria-label="תשובה ללקוח" placeholder="כתיבת תשובה ידנית…"></textarea><button type="submit" class="btn" id="t-send">`+svg('send')+String.raw`שליחה</button></div>
   <div class="hint"><label class="check"><input type="checkbox" id="t-stop" checked>השבתת הבוט ללקוח אחרי התשובה</label><span id="t-from"></span></div>
   <p class="hint bad" id="t-error" role="alert" hidden></p>
  </form>
  <p class="hint t-form" id="t-nosend" hidden>אין לך הרשאה לשלוח מהמספר הזה, אז אפשר רק לצפות בשיחה.</p>
 </section>
 <aside class="c-side side" id="side" aria-label="פרטי השיחה"></aside>
</main>`;
const script = String.raw`
const STATES={active:'בשיחה',done:'הסתיימה',blocked:'הבוט מושבת',opted_out:'ביקש הסרה'};
const SUBMIT={pending:'בתהליך',accepted:'התקבלה',rejected:'נדחתה',unknown:'לא ידוע'};
const C={threads:new Map(),next:null,sync:null,state:'',flow:'',from:'',q:'',counts:null,flows:[],sel:null,meta:null,msgs:new Map(),msgSync:null,older:null,loading:false,polling:false,gen:0,timer:0,countsAt:0};
function key(t){return t.system_number+'|'+t.peer_number;}
function contactName(contact,peer){const f=ME.contact_fields[0];const v=contact&&f&&contact[f.id];return v||local(peer);}
function when(ms){const d=ymd(ms),now=today();return d===now?clockFmt.format(ms):d===shift(now,-1)?'אתמול':dayFmt.format(ms);}
function params(){const p=new URLSearchParams();if(C.state)p.set('state',C.state);if(C.flow)p.set('flow',C.flow);if(C.from)p.set('from',C.from);if(C.q)p.set('q',C.q);return p;}
function writeUrl(){const p=params();if(C.sel){p.set('n',C.sel.system_number);p.set('p',C.sel.peer_number);}const s=p.toString();history.replaceState(null,'',s?'?'+s:location.pathname);}
function readUrl(){const p=new URLSearchParams(location.search);C.state=STATES[p.get('state')]?p.get('state'):'';C.flow=/^[0-9]+$/.test(p.get('flow')||'')?p.get('flow'):'';C.q=(p.get('q')||'').slice(0,200);$('q').value=C.q;
 const n=normalize(p.get('n')||''),pe=normalize(p.get('p')||'');return n&&pe?{system_number:n,peer_number:pe}:null;}

function renderStates(){const box=$('states');box.replaceChildren();const total=C.counts?Object.values(C.counts).reduce(function(a,b){return a+b;},0):null;
 for(const s of [''].concat(Object.keys(STATES))){const b=el('button');b.type='button';b.setAttribute('aria-pressed',String(C.state===s));const n=C.counts?(s?C.counts[s]:total):null;b.textContent=(s?STATES[s]:'הכל')+(n===null?'':' · '+nf.format(n));
  b.addEventListener('click',function(){C.state=s;loadList();});box.append(b);}}
function renderFlows(){const sel=$('flow');const was=C.flow;sel.replaceChildren();const all=el('option','','כל התהליכים');all.value='';sel.append(all);
 for(const f of C.flows){const o=el('option','',f.name);o.value=String(f.id);sel.append(o);}sel.value=C.flows.some(function(f){return String(f.id)===was;})?was:'';}
async function loadCounts(){try{const d=await get('/api/chats/counts?'+params());C.counts=d.counts;C.flows=d.flows;C.countsAt=Date.now();renderStates();renderFlows();}catch(e){}}

function order(){return Array.from(C.threads.values()).sort(function(a,b){return b.updated_at-a.updated_at||b.id-a.id;});}
function renderList(){const ul=$('items');ul.replaceChildren();const list=order();
 for(const t of list){const li=el('li');const b=el('button','c-item');b.type='button';b.setAttribute('aria-current',String(!!C.sel&&key(C.sel)===key(t)));
  const name=contactName(t.contact,t.peer_number);const av=el('span','avatar',initials(t.contact&&ME.contact_fields[0]?t.contact[ME.contact_fields[0].id]:'',local(t.peer_number).replace(/[^0-9]/g,'').slice(-2)));
  const main=el('span','c-main');const row=el('span','c-row');row.append(el('span','c-name',name),el('span','c-time',when(t.last?t.last.at:t.last_at)));
  const last=t.last?(t.last.direction==='out'?(t.last.by==='בוט'?'בוט: ':'אתם: '):'')+t.last.body:'';
  const meta=el('span','c-meta');meta.append(el('span','state-dot '+t.state),el('span','',STATES[t.state]+(t.flow?' · '+t.flow:'')+(ME.numbers.length>1?' · '+(labelOf(t.system_number)):'')));
  main.append(row,el('span','c-last',last.replace(/\s+/g,' ')),meta);b.append(av,main);b.addEventListener('click',function(){select(t);});li.append(b);ul.append(li);}
 $('skeleton').hidden=!(C.loading&&!list.length);const empty=!C.loading&&!list.length;$('list-empty').hidden=!empty;
 if(empty){const f=!!(C.state||C.flow||C.q||C.from);$('list-empty-title').textContent=f?'לא נמצאו שיחות':'עדיין אין שיחות בוט';$('list-empty-sub').textContent=f?'נסו לשנות את הסינון.':'שיחות יופיעו כאן כשלקוח יתחיל תהליך בוט.';}
 $('more').hidden=!C.next;}
function labelOf(n){const x=ME.numbers.find(function(y){return y.number===n;});return x?x.label:local(n);}
async function loadList(){const g=++C.gen;C.loading=true;C.threads.clear();C.next=null;renderList();writeUrl();renderStates();loadCounts();
 try{const d=await get('/api/chats?'+params());if(g!==C.gen)return;for(const t of d.threads)C.threads.set(key(t),t);C.next=d.next_cursor;C.sync=d.sync_cursor;}
 catch(e){if(g===C.gen)toast(message(e));}finally{if(g===C.gen){C.loading=false;renderList();$('live').className='live ok';$('live-text').textContent='עדכון חי';}}}
$('more').addEventListener('click',async function(){if(!C.next)return;const b=this;b.disabled=true;try{const p=params();p.set('cursor',C.next);const d=await get('/api/chats?'+p);for(const t of d.threads)C.threads.set(key(t),t);C.next=d.next_cursor;renderList();}catch(e){toast(message(e));}finally{b.disabled=false;}});
let qt=0;$('q').addEventListener('input',function(){clearTimeout(qt);qt=setTimeout(function(){const v=$('q').value.trim();if(v!==C.q){C.q=v;loadList();}},400);});
$('flow').addEventListener('change',function(){C.flow=this.value;loadList();});
// Only chats with a message from this date and time on are listed, and an export holds only those messages (Israel time).
function setFrom(){const d=$('from-d').value;C.from=d?String(israelTime(d,$('from-t').value||'00:00')):'';$('from-clear').hidden=!d;loadList();}
$('from-d').addEventListener('change',setFrom);$('from-t').addEventListener('change',function(){if($('from-d').value)setFrom();});
$('from-clear').addEventListener('click',function(){$('from-d').value='';$('from-t').value='';setFrom();});
// Export of the chosen flow's chats (the state and date filters apply): an Excel file with a summary per customer, the full
// transcript and the answers, or just the transcript as CSV. Built here from pages of /api/chats/export.
const EXPORT_MAX=50000,tf=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const MATCH={option:'תשובה מזוהה',text:'תשובה חופשית',none:'לא זוהתה'};let exporting=false;
function exportNote(t){$('export-note').hidden=!t;$('export-note').textContent=t||'';}
async function exportChats(kind){if(exporting)return;if(!C.flow){toast('בחרו תהליך לייצוא');return;}exporting=true;exportNote('מייצא…');
 try{const p=new URLSearchParams();p.set('flow',C.flow);if(C.state)p.set('state',C.state);if(C.from)p.set('from',C.from);
  let cursor=null,flow=null;const threads=[],messages=[],answers=[];
  do{const q=new URLSearchParams(p);if(cursor!==null)q.set('cursor',String(cursor));const d=await get('/api/chats/export?'+q);flow=d.flow;for(const x of d.threads)threads.push(x);for(const x of d.messages)messages.push(x);for(const x of d.answers)answers.push(x);cursor=d.next_cursor;
   exportNote('מייצא… '+nf.format(threads.length)+' שיחות');if(messages.length>EXPORT_MAX)throw new Error('הייצוא גדול מדי (יותר מ-'+nf.format(EXPORT_MAX)+' הודעות). אפשר לצמצם בעזרת תאריך התחלה או מצב.');}while(cursor!==null);
  if(!threads.length){toast('אין שיחות לייצוא לפי הסינון הנוכחי');return;}
  const fields=ME.contact_fields||[],qs=flow.steps.filter(function(x){return x.type!=='end';}),stepNo=function(id){const i=flow.steps.findIndex(function(x){return x.id===id;});return i<0?'':'שלב '+(i+1);};
  const byThread=new Map(threads.map(function(t){return [t.id,t];})),byMsg=new Map(answers.map(function(a){return [a.message_id,a];}));
  const who=function(m){return m.direction==='in'?'לקוח':m.bot&&m.sent_by==='בוט'?'בוט':m.sent_by||'נשלחה ממערכת אחרת';};
  const result=function(m){const b=m.bot;if(!b||m.direction!=='in'||!b.match)return '';return (MATCH[b.match]||'')+(b.gave_up?' (הבוט ויתר)':b.retry?' (חזרה על השאלה)':'');};
  const tHead=['לקוח','זמן','כותב','הודעה','שלב','תוצאה','משמעות'];
  const tRows=messages.map(function(m){const t=byThread.get(m.thread),a=byMsg.get(m.id);return [local(t.peer_number),tf.format(m.occurred_at),who(m),m.body,m.bot&&m.bot.step?stepNo(m.bot.step):'',result(m),a&&a.meaning||''];});
  const stamp=ymd(Date.now()),base=('שיחות בוט - '+flow.name).replace(/[\\/:*?"<>|]+/g,' ').trim()+' '+stamp;
  if(kind==='csv'){const lines=[tHead].concat(tRows).map(function(r){return r.map(function(v){return csvCell(v,false);}).join(',');});download(new Blob([String.fromCharCode(0xfeff)+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),base+'.csv');}
  else{const last=new Map();for(const a of answers)last.set(a.peer_number+'|'+a.step,a);const counts=new Map();for(const m of messages)counts.set(m.thread,(counts.get(m.thread)||0)+1);
   const sHead=['לקוח','מספר מערכת'].concat(fields.map(function(f){return f.label;}),['מצב','התחלה','הודעה אחרונה','הודעות'],qs.map(function(x){return stepNo(x.id)+': '+x.text.split('\n')[0].slice(0,40);}));
   const sRows=threads.map(function(t){const c=t.contact||{};return [local(t.peer_number),labelOf(t.system_number)].concat(fields.map(function(f){return c[f.id]||'';}),[STATES[t.state],tf.format(t.started_at),tf.format(t.last_at),counts.get(t.id)||0],qs.map(function(x){const a=last.get(t.peer_number+'|'+x.id);return a?(a.meaning||a.answer):'';}));});
   const aRows=answers.map(function(a){return [tf.format(a.at),local(a.peer_number),stepNo(a.step),a.question,a.answer,a.meaning||''];});
   download(await xlsxBook([{name:'סיכום',head:sHead,data:sRows,widths:[16,16].concat(fields.map(function(){return 18;}),[12,19,19,9],qs.map(function(){return 22;}))},{name:'שיחות',head:tHead,data:tRows,widths:[16,19,12,60,10,18,16]},{name:'תשובות',head:['זמן','לקוח','שלב','שאלה','תשובה','משמעות'],data:aRows,widths:[19,16,10,40,24,16]}]),base+'.xlsx');}
  toast('הקובץ מוכן ('+plural(threads.length,'שיחה אחת','שיחות')+')');}
 catch(e){toast(message(e));}finally{exporting=false;exportNote('');}}
$('export-xlsx').addEventListener('click',function(){exportChats('xlsx');});$('export-csv').addEventListener('click',function(){exportChats('csv');});

// The chosen conversation. Messages come newest first in pages of 100 and are shown oldest first.
async function select(t){C.sel={system_number:t.system_number,peer_number:t.peer_number};C.meta=null;C.msgs.clear();C.msgSync=null;C.older=null;
 $('chats').classList.add('has-thread');$('t-none').hidden=true;for(const id of ['t-head','t-body'])$(id).hidden=false;$('t-body').replaceChildren();$('t-error').hidden=true;writeUrl();renderList();renderHead(t);
 const can=canSend(t.system_number);$('t-form').hidden=!can;$('t-nosend').hidden=can;$('t-from').textContent='נשלח מ-'+labelOf(t.system_number)+' · '+local(t.system_number);
 try{await Promise.all([loadMeta(),loadMessages()]);}catch(e){toast(message(e));}if(C.sel&&key(C.sel)===key(t))renderThread(true);}
function canSend(n){return ME.numbers.some(function(x){return x.number===n&&x.can_send;});}
function thread(){return C.sel?C.threads.get(key(C.sel)):null;}
function renderHead(t){const c=(C.meta&&C.meta.contact)||(t&&t.contact)||null;const peer=C.sel.peer_number;$('t-name').textContent=contactName(c,peer);$('t-phone').textContent=local(peer);
 $('t-avatar').textContent=initials(c&&ME.contact_fields[0]?c[ME.contact_fields[0].id]:'',local(peer).replace(/[^0-9]/g,'').slice(-2));
 const st=stateOf();$('t-state').textContent=STATES[st]+(flowName()?' · '+flowName():'');$('t-state').className='tag'+(st==='active'?' accent':st==='blocked'||st==='opted_out'?' off':'');
 $('t-table').href='/?peer='+encodeURIComponent(peer)+'&num='+encodeURIComponent(C.sel.system_number);
 const blocked=st==='blocked';const b=$('t-bot');b.replaceChildren(icon(blocked?'bot-on':'bot-off'),blocked?'הפעלת הבוט':'השבתת הבוט');b.hidden=!canSend(C.sel.system_number)||st==='opted_out';}
function stateOf(){const m=C.meta;if(m)return m.blocked?'blocked':m.opted_out?'opted_out':m.conversation?'active':'done';const t=thread();return t?t.state:'done';}
function flowById(id){return C.meta&&C.meta.flows.find(function(f){return f.id===id;});}
function flowName(){const m=C.meta;const id=m&&(m.conversation?m.conversation.flow_id:m.thread&&m.thread.flow_id);const f=id&&flowById(id);if(f)return f.name;const t=thread();return t&&t.flow||'';}
async function loadMeta(){const s=C.sel;const d=await get('/api/chats/thread?system_number='+encodeURIComponent(s.system_number)+'&peer_number='+encodeURIComponent(s.peer_number));if(C.sel===s){C.meta=d;renderHead(thread());renderSide();}}
function msgQuery(){const p=new URLSearchParams();p.set('system_number',C.sel.system_number);p.set('peer_number',C.sel.peer_number);p.set('sort','time');p.set('order','desc');p.set('limit','100');return p;}
async function loadMessages(){const s=C.sel;const d=await get('/api/messages?'+msgQuery());if(C.sel!==s)return;for(const m of d.messages)C.msgs.set(m.id,m);C.older=d.next_cursor;C.msgSync=d.sync_cursor;}
async function loadOlder(){if(!C.older)return;const s=C.sel;const p=msgQuery();p.set('cursor',C.older);const body=$('t-body');const h=body.scrollHeight;
 const d=await get('/api/messages?'+p);if(C.sel!==s)return;for(const m of d.messages)C.msgs.set(m.id,m);C.older=d.next_cursor;renderThread(false);body.scrollTop=body.scrollHeight-h;}

// What the bot made of a customer's reply, and the options of the question a bot message asks (the chosen one marked).
function answerFor(id){return C.meta?C.meta.answers.find(function(a){return a.message_id===id;}):null;}
function stepOf(note){const f=note&&note.flow&&flowById(note.flow);return f?{flow:f,step:f.steps.find(function(s){return s.id===note.step;})}:null;}
function heardNotes(m){const n=m.bot;const out=[];if(!n)return out;
 if(n.external)out.push(['accent','תשובה לשאלה שנשלחה ממערכת אחרת']);
 if(n.start){const f=flowById(n.start);out.push(['accent','התחיל תהליך'+(f?' '+f.name:'')]);}
 else if(n.match==='option'){const a=answerFor(m.id);out.push(['good','זוהה: '+(a?(a.meaning||a.answer):m.body)]);}
 else if(n.match==='text'){out.push(['good','נשמרה כתשובה']);}
 else if(n.match==='none')out.push(n.gave_up?['bad','לא זוהה · הבוט הפסיק לשאול']:['warn','לא זוהה · שאלה חוזרת '+n.retry+'/2']);
 return out;}
function chosenAfter(list,i,stepId){for(let j=i+1;j<list.length;j++){const x=list[j];if(x.direction!=='in')continue;if(x.bot&&x.bot.step===stepId&&x.bot.match==='option'){const a=answerFor(x.id);return a?a.meaning||a.answer:null;}return null;}return null;}
function renderThread(scroll){const body=$('t-body');const atEnd=body.scrollHeight-body.scrollTop-body.clientHeight<60;body.replaceChildren();
 const list=Array.from(C.msgs.values()).sort(function(a,b){return a.occurred_at-b.occurred_at||a.id-b.id;});
 if(C.older){const b=el('button','ghost','הודעות קודמות');b.type='button';b.style.alignSelf='center';b.addEventListener('click',function(){b.disabled=true;loadOlder().catch(function(e){toast(message(e));b.disabled=false;});});body.append(b);}
 let day='';for(let i=0;i<list.length;i++){const m=list[i];const d=ymd(m.occurred_at);if(d!==day){day=d;const now=today();body.append(el('div','day',d===now?'היום':d===shift(now,-1)?'אתמול':yearFmt.format(m.occurred_at)));}
  const isBot=m.direction==='out'&&m.sent_by==='בוט';const box=el('div','msg '+m.direction+(isBot?' bot':''));
  if(m.direction==='out'){const who=el('span','who-line');if(isBot){who.append(icon('bot-on'));const s=stepOf(m.bot);who.append('בוט'+(s?' · '+s.flow.name:''));}else who.append(m.sent_by||'נשלחה ממערכת אחרת');box.append(who);}
  box.append(el('div','bubble',m.body));
  if(isBot){const s=stepOf(m.bot);if(s&&s.step&&s.step.options&&s.step.options.length){const chosen=chosenAfter(list,i,s.step.id);const opts=el('div','opts');
   for(const o of s.step.options){const mean=o.meaning||o.reply;opts.append(el('span','opt-chip'+(chosen!==null&&chosen===mean?' on':''),o.reply.split(',')[0].trim()+' · '+mean));}box.append(opts);}}
  const foot=el('div','m-foot');foot.append(el('span','',clockFmt.format(m.occurred_at)));
  if(m.direction==='out'){foot.append(el('span','','· '+(SUBMIT[m.submission_status]||'')));if(m.is_test)foot.append(el('span','note','בדיקה'));if(m.clicks>0)foot.append(el('span','note good','הקישור נלחץ'));}
  for(const n of heardNotes(m))foot.append(el('span','note '+n[0],n[1]));box.append(foot);body.append(box);}
 if(!list.length)body.append(el('p','hint','אין הודעות שאפשר להציג בשיחה הזו.'));
 if(scroll||atEnd)body.scrollTop=body.scrollHeight;}

function renderSide(){const side=$('side');side.replaceChildren();const m=C.meta;if(!m)return;
 const close=el('button','ghost t-info','סגירה');close.type='button';close.addEventListener('click',function(){$('chats').classList.remove('side-open');});side.append(close);
 const who=el('section');who.append(el('h2','','פרטי לקוח'));const facts=el('div','facts');const row=function(a,b){const d=el('div');d.append(el('span','',a),el('span',/^[0-9+\- ]+$/.test(b)?'phone':'',b));facts.append(d);};
 row('טלפון',local(C.sel.peer_number));for(const f of ME.contact_fields)if(m.contact&&m.contact[f.id])row(f.label,m.contact[f.id]);who.append(facts);side.append(who);
 const st=el('section');st.append(el('h2','','מצב הבוט'));const box=el('div','state-box');
 if(m.blocked)box.append(el('span','','הבוט מושבת ללקוח הזה'),el('span','hint','על ידי '+(m.blocked.created_by==='bot'?'הבוט':m.blocked.created_by)+' · '+shortFmt.format(m.blocked.created_at)));
 else if(m.opted_out)box.append(el('span','','הלקוח ברשימת ההסרה'),el('span','hint','מאז '+shortFmt.format(m.opted_out.created_at)+'. הבוט לא עונה לו.'));
 else if(m.conversation){const f=flowById(m.conversation.flow_id);const s=f&&f.steps.find(function(x){return x.id===m.conversation.step;});
  box.append(el('span','','בשיחה'+(f?' בתהליך '+f.name:'')),el('span','hint','ממתין לתשובה על: '+(s?s.text.split('\n')[0]:m.conversation.step)),el('span','hint','השיחה תסתיים '+shortFmt.format(m.conversation.expires_at)+' אם לא תגיע תשובה'+(m.conversation.retries?' · '+m.conversation.retries+' חזרות על השאלה':'')));}
 else box.append(el('span','','אין שיחה פעילה'),el('span','hint','הבוט יענה שוב כשהלקוח ישלח הודעה שמתאימה לתהליך.'));
 if(m.thread)box.append(el('span','hint','שיחה ראשונה עם הבוט: '+shortFmt.format(m.thread.started_at)));st.append(box);side.append(st);
 const an=el('section');an.append(el('h2','','תשובות בתהליכים'));const steps=el('ol','steps');let lastFlow=null;
 for(const a of m.answers){if(a.flow_id!==lastFlow){lastFlow=a.flow_id;const f=flowById(a.flow_id);steps.append(el('li','flow-name',f?f.name:'תהליך שנמחק'));}
  const li=el('li');li.append(el('span','q',a.question.split('\n')[0]),el('span','',a.meaning?a.meaning+(a.meaning!==a.answer?' ('+a.answer+')':''):a.answer),el('span','hint',shortFmt.format(a.at)));steps.append(li);}
 if(m.conversation){const f=flowById(m.conversation.flow_id);const s=f&&f.steps.find(function(x){return x.id===m.conversation.step;});if(s){const li=el('li','now');li.append(el('span','q',s.text.split('\n')[0]),el('span','hint','ממתין לתשובה'));steps.append(li);}}
 if(!steps.children.length)an.append(el('p','hint','עדיין לא נאספו תשובות.'));else an.append(steps);side.append(an);}

$('t-info').addEventListener('click',function(){$('chats').classList.add('side-open');});
$('t-back').addEventListener('click',function(){C.sel=null;$('chats').classList.remove('has-thread','side-open');$('t-none').hidden=false;for(const id of ['t-head','t-body','t-form','t-nosend'])$(id).hidden=true;$('side').replaceChildren();writeUrl();renderList();});
$('t-bot').addEventListener('click',async function(){const s=C.sel;if(!s)return;const block=stateOf()!=='blocked';
 if(block&&!await confirmAction('השבתת הבוט','הבוט לא יענה ל-'+local(s.peer_number)+' עד שיופעל מחדש, וכל שיחה פתוחה תסתיים.','השבתה'))return;
 const b=this;b.disabled=true;try{await post('/api/bot/block',{system_number:s.system_number,peer_number:s.peer_number,blocked:block});await loadMeta();toast(block?'הבוט הושבת ללקוח הזה':'הבוט הופעל מחדש ללקוח הזה');tick();}catch(e){toast(message(e));}finally{b.disabled=false;}});
// A manual reply goes through the regular send, so permissions, limits and opt-outs apply; by default it turns the bot off.
$('t-form').addEventListener('submit',async function(e){e.preventDefault();const s=C.sel;const text=$('t-text').value;if(!s||!text.trim())return;const b=$('t-send');b.disabled=true;$('t-error').hidden=true;
 try{const d=await post('/api/send',{id:crypto.randomUUID(),system_number:s.system_number,recipients:[s.peer_number],body:text,stop_bot:$('t-stop').checked});
  if(d.status==='rejected')throw new Error('הספק דחה את ההודעה'+(d.error?': '+d.error:''));$('t-text').value='';await Promise.all([tick(),loadMeta()]);}
 catch(err){$('t-error').hidden=false;$('t-error').textContent=message(err);}finally{b.disabled=false;}});
$('t-text').addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('t-form').requestSubmit();}});

// Live updates: changed threads, and new or changed messages of the open conversation. A changed open thread reloads
// its side panel. Counts read every thread, so they refresh at most every 10 minutes while something changes.
async function tick(){if(C.polling||C.loading||!C.sync)return;C.polling=true;const g=C.gen;
 try{let changed=false,openChanged=false;const p=params();p.delete('state');p.set('since',C.sync);const d=await get('/api/chats?'+p);if(g!==C.gen)return;
  for(const t of d.threads){const k=key(t);if(C.state&&t.state!==C.state){if(C.threads.delete(k))changed=true;}else{C.threads.set(k,t);changed=true;}if(C.sel&&k===key(C.sel))openChanged=true;}C.sync=d.sync_cursor;
  if(changed)renderList();if(changed&&Date.now()-C.countsAt>600000)loadCounts();
  if(C.sel&&C.msgSync){const s=C.sel;const mp=msgQuery();mp.set('since',C.msgSync);const md=await get('/api/messages?'+mp);if(C.sel===s){for(const m of md.messages)C.msgs.set(m.id,m);C.msgSync=md.sync_cursor;if(openChanged)await loadMeta();if(md.messages.length||openChanged)renderThread(false);}}
  $('live').className='live ok';$('live-text').textContent='עדכון חי';}
 catch(e){$('live').className='live err';$('live-text').textContent=e&&e.message==='offline'?'אין חיבור':'שגיאה';}
 finally{C.polling=false;}}
function schedule(){clearTimeout(C.timer);C.timer=setTimeout(function(){tick().finally(schedule);},document.hidden?30000:(ME?ME.settings.refresh_seconds:5)*1000);}
// The page fills the window below the header, whose height changes when it wraps on narrow screens.
function fit(){document.documentElement.style.setProperty('--top',document.querySelector('header.top').offsetHeight+'px');}
fit();window.addEventListener('resize',fit);
document.addEventListener('visibilitychange',function(){if(!document.hidden){tick();schedule();}});
(async function(){try{await loadMe();}catch(e){$('live').className='live err';$('live-text').textContent='שגיאה';toast(message(e));return;}
 const want=readUrl();renderStates();await loadList();if(want){const t=C.threads.get(key(want))||{system_number:want.system_number,peer_number:want.peer_number,state:'done'};select(t);}schedule();})();
`;
export function chatsPage(nonce:string):string { return shell(nonce,'שיחות בוט · הודעות SMS',css,body,script); }

import {header,shell,svg} from './ui';
export {adminPage} from './admin-page';
export {noAccessPage} from './ui';
const css = String.raw`
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0}
.stat{padding:12px 16px;border:1px solid var(--ring);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
.stat dt{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink2)}
.stat dd{margin:2px 0 0;font-size:26px;font-weight:650;letter-spacing:-.02em}
.key{width:8px;height:8px;border-radius:2px;background:var(--in)}
.key.out{background:var(--out)}
.msgs{min-width:880px;table-layout:fixed}
.busy.has-rows .msgs{opacity:.55}
col.c-time{width:112px}col.c-dir{width:100px}col.c-peer{width:144px}col.c-num{width:160px}col.c-status{width:124px}
.msgs tbody tr{cursor:pointer}
.msgs tbody tr:hover>td{background:var(--hover)}
.msgs tbody tr>td:first-child{border-inline-start:3px solid transparent}
.msgs tr.in>td:first-child{border-inline-start-color:var(--in)}
.msgs tr.out>td:first-child{border-inline-start-color:var(--out)}
.msgs tr.open>td{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.msgs tr.fresh>td{animation:flash 2.6s ease-out}
@keyframes flash{from{background:color-mix(in srgb,var(--accent) 20%,transparent)}to{background:transparent}}
.c-time{white-space:nowrap;font-variant-numeric:tabular-nums}
.day{display:block;font-weight:550}
.clock{display:block;font-size:12.5px;color:var(--muted)}
.dir{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,var(--in) 12%,transparent);font-size:12.5px;font-weight:550;color:var(--ink2)}
.dir .i{width:14px;height:14px;color:var(--in)}
.dir.out{background:color-mix(in srgb,var(--out) 13%,transparent)}
.dir.out .i{color:var(--out)}
.peer{padding:0;border:0;background:transparent;color:var(--accent-ink);font-weight:550;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px}
.peer:hover{text-decoration-color:currentColor}
.num-label{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.num-sub{display:block;font-size:12.5px;color:var(--muted)}
.body{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:var(--clamp);white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext}
tr.open .body{display:block;overflow:visible}
.details{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:12.5px;color:var(--ink2);cursor:auto}
.details b{margin-inline-end:6px;font-weight:600;color:var(--muted)}
.actions{display:flex;gap:6px;margin-inline-start:auto}
.act{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--field);font-size:12.5px;cursor:pointer}
.act:hover{border-color:var(--accent)}
[data-density=dense] .day,[data-density=dense] .clock{display:inline}[data-density=dense] .clock{margin-inline-start:6px}[data-density=dense] .num-sub{display:none}[data-density=dense] .dir{padding-block:0}
.more-row{display:flex;justify-content:center;padding:14px}
.more{height:36px;padding:0 16px;border:1px solid var(--line);border-radius:9px;background:var(--field);cursor:pointer}
.sort-m{display:none}
#c-file-btn{cursor:pointer}
#c-to:placeholder-shown{direction:rtl}
.dialog-body .banner{border:0;border-radius:9px}
@media (max-width:760px){
.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stat{padding:10px 12px}.stat dd{font-size:22px}
.sort-m{display:block}#new{flex:1 1 100%}
.table-wrap{overflow:visible}.msgs{min-width:0}.msgs colgroup,.msgs thead{display:none}.msgs,.msgs tbody{display:block}
.msgs tbody tr{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"dir peer time" "msg msg msg" "num num status";gap:8px 10px;padding:var(--card-pad) 14px;border-bottom:1px solid var(--line);border-inline-start:3px solid transparent}
[data-density=dense] .msgs tbody tr{gap:4px 10px}
.msgs tr.in{border-inline-start-color:var(--in)}.msgs tr.out{border-inline-start-color:var(--out)}
.msgs td{display:block;min-width:0;padding:0;border:0}
.msgs tbody tr>td:first-child{border:0}
.msgs tbody tr:hover>td,.msgs tr.open>td{background:none}
.msgs tr.open{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.msgs tr.fresh{animation:flash 2.6s ease-out}.msgs tr.fresh>td{animation:none}
.c-time{grid-area:time;text-align:end}.c-dir{grid-area:dir}.c-peer{grid-area:peer;align-self:center}.c-msg{grid-area:msg}.c-status{grid-area:status}
.c-num{grid-area:num;display:flex;align-items:baseline;gap:6px;min-width:0}
.day,.clock,.num-label,.num-sub{display:inline}.clock{margin-inline-start:6px}
.actions{margin-inline-start:0}
}
`;
const body = header('messages',true) + String.raw`
<main class="wrap">
 <dl class="stats" aria-label="סיכום לפי הסינון הנוכחי">
  <div class="stat"><dt>הודעות</dt><dd id="s-total">—</dd></div>
  <div class="stat"><dt><span class="key"></span>נכנסות</dt><dd id="s-in">—</dd></div>
  <div class="stat"><dt><span class="key out"></span>יוצאות</dt><dd id="s-out">—</dd></div>
  <div class="stat"><dt>לקוחות</dt><dd id="s-peers">—</dd></div>
 </dl>
 <section class="panel fill" id="panel" aria-label="הודעות">
  <div class="progress"></div>
  <form class="toolbar" id="filters" role="search">
   <label class="field search">`+svg('search')+String.raw`<input id="q" type="search" maxlength="200" placeholder="חיפוש בטקסט או במספר" aria-label="חיפוש בטקסט או במספר"></label>
   <div class="seg" role="group" aria-label="כיוון"><button type="button" data-dir="" aria-pressed="true">הכל</button><button type="button" data-dir="in" aria-pressed="false">נכנסות</button><button type="button" data-dir="out" aria-pressed="false">יוצאות</button></div>
   <select id="number" aria-label="מספר מערכת"><option value="">כל המספרים</option></select>
   <select id="status" aria-label="סטטוס הגשה"><option value="">כל הסטטוסים</option><option value="pending">בתהליך</option><option value="accepted">התקבלה</option><option value="rejected">נדחתה</option><option value="unknown">לא ידוע</option></select>
   <select id="range" aria-label="טווח תאריכים"><option value="">כל התאריכים</option><option value="today">היום</option><option value="7">7 הימים האחרונים</option><option value="30">30 הימים האחרונים</option><option value="custom">טווח מותאם…</option></select>
   <span class="custom" id="custom" hidden><input type="date" id="from" aria-label="מתאריך"><span>–</span><input type="date" id="to" aria-label="עד תאריך"></span>
   <select class="sort-m" id="sort-m" aria-label="מיון"><option value="time:desc">החדשות קודם</option><option value="time:asc">הישנות קודם</option><option value="peer:asc">לפי לקוח</option><option value="number:asc">לפי מספר מערכת</option><option value="direction:asc">לפי כיוון</option><option value="status:asc">לפי סטטוס</option></select>
   <button type="button" class="btn end" id="new" hidden>`+svg('send')+String.raw`הודעה חדשה</button>
  </form>
  <div class="chips" id="chips"></div>
  <div class="banner" id="error" role="alert" hidden><span id="error-text"></span><button type="button" class="ghost" id="reload" hidden>רענון הדף</button></div>
  <div class="table-wrap" id="scroll">
   <table class="msgs"><colgroup><col class="c-time"><col class="c-dir"><col class="c-peer"><col class="c-num"><col><col class="c-status"></colgroup>
    <thead><tr>
     <th scope="col" data-sort="time"><button type="button">זמן<span class="sort-i"></span></button></th>
     <th scope="col" data-sort="direction"><button type="button">כיוון<span class="sort-i"></span></button></th>
     <th scope="col" data-sort="peer"><button type="button">לקוח<span class="sort-i"></span></button></th>
     <th scope="col" data-sort="number"><button type="button">מספר מערכת<span class="sort-i"></span></button></th>
     <th scope="col"><span>הודעה</span></th>
     <th scope="col" data-sort="status"><button type="button">סטטוס הגשה<span class="sort-i"></span></button></th>
    </tr></thead>
    <tbody id="rows"></tbody>
   </table>
   <div class="skeleton" id="skeleton" aria-hidden="true"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
   <div class="empty" id="empty" hidden>`+svg('chat')+String.raw`<p class="empty-title" id="empty-title"></p><p id="empty-sub"></p><button type="button" class="ghost" id="empty-clear" hidden>ניקוי סינון</button></div>
   <div class="more-row" id="more-row" hidden><button type="button" class="more" id="more">טעינת הודעות נוספות</button></div>
  </div>
  <div class="foot"><span id="count"></span><span>הזמנים לפי שעון ישראל · הודעות יוצאות מוצגות רק ממערכות שמדווחות עליהן<span id="updated"></span></span></div>
 </section>
</main>
<dialog id="compose" aria-labelledby="c-title"><form class="dialog-body" id="c-form" novalidate>
 <div class="dialog-head"><h2 id="c-title">הודעה חדשה</h2><button type="button" class="icon-btn" id="c-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <label class="fld"><span>שליחה מהמספר</span><select id="c-from"></select></label>
 <div class="fld"><label class="label" for="c-to">נמענים</label>
  <textarea id="c-to" dir="ltr" rows="3" placeholder="מספרי טלפון מופרדים בפסיק או בשורה חדשה"></textarea>
  <div class="row"><span class="hint" id="c-summary"></span><label class="ghost end" id="c-file-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="c-file" accept=".csv,.txt,.xlsx" hidden></label></div>
  <div class="row" id="c-import" hidden><span class="hint" id="c-import-info"></span><label class="row hint">עמודת הטלפון<select id="c-column"></select></label><button type="button" class="ghost danger" id="c-import-clear">הסרת הקובץ</button></div>
  <p class="hint bad" id="c-invalid" hidden></p>
 </div>
 <div class="fld"><label class="label" for="c-body">הודעה</label><textarea id="c-body" rows="5" maxlength="1000"></textarea>
  <div class="row"><span class="hint" id="c-count"></span><span class="hint end" id="c-usage"></span></div><p class="hint" id="c-optout" hidden></p></div>
 <div class="banner" id="c-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="hint" id="c-total"></span><button type="button" class="ghost" id="c-cancel">ביטול</button><button type="submit" class="btn" id="c-send">`+svg('send')+String.raw`<span id="c-send-text">המשך</span></button></div>
</form></dialog>
`;
const script = String.raw`
const STATUS={pending:['בתהליך','warn','clock','ההגשה בתהליך'],accepted:['התקבלה','good','check','ההגשה התקבלה אצל הספק. זה אינו אישור מסירה'],rejected:['נדחתה','bad','x','ההגשה נדחתה'],unknown:['לא ידוע','neutral','question','תוצאת ההגשה לא ידועה']};
const DEF={q:'',dir:'',number:'',status:'',range:'',from:'',to:'',peer:'',sort:'time',order:'desc'};
const ALLOWED={dir:['','in','out'],status:['','pending','accepted','rejected','unknown'],range:['','today','7','30','custom'],sort:['time','direction','peer','number','status'],order:['asc','desc']};
const DATE=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
let state=Object.assign({},DEF);
const rows=new Map(),cache=new Map(),fresh=new Set(),expanded=new Set(),labels=new Map();
let next=null,sync=null,boundary=null,maxId=null,total=null,gen=0,loading=false,polling=false,paging=false,stopped=false,fails=0,unseen=0,timer=0,debounce=0,noNumbers=false;

function when(ms,now){const d=ymd(ms);const day=d===now?'היום':d===shift(now,-1)?'אתמול':(d.slice(0,4)===now.slice(0,4)?dayFmt:yearFmt).format(ms);return [day,clockFmt.format(ms)];}
function readUrl(){const p=new URLSearchParams(location.search);for(const k in DEF){const v=p.get(k);if(v!==null)state[k]=v.slice(0,200);}
 for(const k in ALLOWED)if(!ALLOWED[k].includes(state[k]))state[k]=DEF[k];if(!DATE.test(state.from))state.from='';if(!DATE.test(state.to))state.to='';}
function writeUrl(){const p=new URLSearchParams();for(const k in DEF)if(state[k]!==DEF[k])p.set(k,state[k]);const s=p.toString();history.replaceState(null,'',s?'?'+s:location.pathname);}
function filtered(){return !!(state.q||state.dir||state.number||state.status||state.range||state.peer);}
function bounds(){const t=today();if(state.range==='today')return [midnight(t)];if(state.range==='7'||state.range==='30')return [midnight(shift(t,1-Number(state.range)))];
 if(state.range==='custom')return [state.from?midnight(state.from):undefined,state.to?midnight(shift(state.to,1)):undefined];return [];}
function query(withStatus){const p=new URLSearchParams();if(state.number)p.set('system_number',state.number);if(state.peer)p.set('peer_number',state.peer);if(state.q)p.set('q',state.q);if(state.dir)p.set('direction',state.dir);if(state.status&&withStatus)p.set('status',state.status);
 const b=bounds();if(b[0]!==undefined)p.set('from',String(b[0]));if(b[1]!==undefined)p.set('to',String(b[1]));p.set('sort',state.sort);p.set('order',state.order);p.set('limit','100');return p;}

function live(kind,text){$('live').className='live '+kind;$('live-text').textContent=text;}
function ok(){fails=0;live('ok','עדכון חי');$('updated').textContent=' · עודכן '+secFmt.format(Date.now());if(!$('error').dataset.sticky)$('error').hidden=true;}
function showError(text,reload){$('error').hidden=false;$('error-text').textContent=text;$('reload').hidden=!reload;$('error').dataset.sticky=reload?'1':'';}
function fail(e,initial){fails++;const m=e&&e.message||'';
 if(m==='auth'||m==='This account has no access'){stopped=true;live('err','נדרשת התחברות');showError(m==='auth'?message(e):'הגישה שלך למערכת הוסרה.',true);return;}
 if(m==='offline'){live('err','אין חיבור');if(initial||fails>=3)showError('אין חיבור לשרת. מנסים שוב אוטומטית…');return;}
 live('err','שגיאה');showError('טעינת הנתונים נכשלה: '+m);}
function busy(on){$('panel').classList.toggle('busy',on);}
function title(){document.title=(unseen?'('+unseen+') ':'')+'הודעות SMS';}

async function stats(g){try{const s=await get('/api/stats?'+query(true));if(g!==gen)return;maxId=s.max_id;total=s.total;
  $('s-total').textContent=nf.format(s.total);$('s-in').textContent=nf.format(s.incoming);$('s-out').textContent=nf.format(s.outgoing);$('s-peers').textContent=nf.format(s.peers);count();}
 catch(e){if(g===gen)for(const id of ['s-total','s-in','s-out','s-peers'])$(id).textContent='—';}}
async function load(){const g=++gen;loading=true;total=null;maxId=null;busy(true);writeUrl();ui();render();
 try{const d=(await Promise.all([get('/api/messages?'+query(true)),stats(g)]))[0];if(g!==gen)return;
  rows.clear();fresh.clear();expanded.clear();for(const m of d.messages)rows.set(m.id,m);
  next=d.next_cursor;sync=d.sync_cursor;boundary=d.has_more?d.messages[d.messages.length-1]:null;$('scroll').scrollTop=0;ok();}
 catch(e){if(g===gen){rows.clear();next=null;sync=null;fail(e,true);}}
 finally{if(g===gen){loading=false;busy(false);render();}}}
// Live updates fetch rows changed since the last sync. Rows past the last loaded page are left for "load more",
// and the status filter is applied here because a status change can move a row out of the filter.
async function poll(){if(loading||polling)return;polling=true;const g=gen;
 try{let changed=false,grew=false;
  for(let i=0;i<20;i++){const p=query(false);p.set('since',sync);const d=await get('/api/messages?'+p);if(g!==gen)return;
   for(const m of d.messages){const had=rows.has(m.id);if(maxId!==null&&m.id>maxId){grew=true;if(document.hidden&&m.direction==='in')unseen++;}
    if((state.status&&m.submission_status!==state.status)||(boundary&&cmp(m,boundary)>0)){if(had){rows.delete(m.id);changed=true;}continue;}
    rows.set(m.id,m);fresh.add(m.id);changed=true;}
   sync=d.sync_cursor;if(!d.has_more)break;}
  ok();if(changed)render();if(grew||(changed&&maxId===null))await stats(g);title();}
 catch(e){if(g===gen)fail(e,false);}
 finally{polling=false;}}
async function more(){if(!next||loading||paging)return;paging=true;const g=gen;const b=$('more');b.disabled=true;b.textContent='טוען…';
 try{const p=query(true);p.set('cursor',next);const d=await get('/api/messages?'+p);if(g!==gen)return;for(const m of d.messages)rows.set(m.id,m);
  next=d.next_cursor;boundary=d.has_more?d.messages[d.messages.length-1]:null;render();}
 catch(e){if(g===gen)fail(e,false);}
 finally{paging=false;b.disabled=false;b.textContent='טעינת הודעות נוספות';}}
async function tick(){if(stopped)return;if(!sync){if(!loading)await load();}else await poll();}
function schedule(){clearTimeout(timer);if(stopped)return;timer=setTimeout(function(){tick().finally(schedule);},document.hidden?30000:(ME?ME.settings.refresh_seconds:5)*1000);}

function key(m){switch(state.sort){case 'direction':return m.direction;case 'peer':return m.peer_number;case 'number':return m.system_number;case 'status':return m.submission_status||'';default:return m.occurred_at;}}
function cmp(a,b){const x=key(a),y=key(b);const c=x<y?-1:x>y?1:a.id-b.id;return state.order==='asc'?c:-c;}
// Rows are keyed by message ID and only rebuilt when they change, so focus and text selection survive live updates.
function render(){const list=Array.from(rows.values()).sort(cmp);const body=$('rows');const now=today();let at=body.firstChild;
 for(const m of list){const tr=row(m,now);if(tr!==at)body.insertBefore(tr,at);else at=at.nextSibling;}
 while(at){const n=at.nextSibling;at.remove();at=n;}
 for(const id of Array.from(cache.keys()))if(!rows.has(id))cache.delete(id);
 $('panel').classList.toggle('has-rows',list.length>0);$('skeleton').hidden=!(loading&&!list.length);
 const empty=!loading&&!list.length;$('empty').hidden=!empty;
 if(empty){$('empty-title').textContent=noNumbers?'עדיין לא שויכו אליך מספרים':filtered()?'לא נמצאו הודעות':'עדיין אין הודעות';
  $('empty-sub').textContent=noNumbers?'יש לפנות למנהל המערכת כדי לשייך מספר לחשבון.':filtered()?'נסו לשנות או לנקות את הסינון.':'הודעות חדשות יופיעו כאן אוטומטית.';$('empty-clear').hidden=!filtered();}
 $('more-row').hidden=!next||!list.length;count();}
function count(){const n=rows.size;$('count').textContent=!n?'':total!==null&&total>n?'מוצגות '+nf.format(n)+' מתוך '+nf.format(total)+' הודעות':nf.format(n)+' הודעות';}
function row(m,now){const open=expanded.has(m.id);const sig=m.updated_at+'|'+open+'|'+now+'|'+(labels.get(m.system_number)||'');const c=cache.get(m.id);
 if(c&&c.sig===sig&&!fresh.has(m.id))return c.tr;const tr=build(m,open,now);if(fresh.delete(m.id))tr.classList.add('fresh');cache.set(m.id,{tr:tr,sig:sig});return tr;}
function build(m,open,now){const tr=el('tr',m.direction+(open?' open':''));tr.tabIndex=0;tr.dataset.id=String(m.id);tr.setAttribute('aria-expanded',String(open));
 const w=when(m.occurred_at,now);const time=el('td','c-time');time.append(el('span','day',w[0]),el('span','clock',w[1]));time.title=fullFmt.format(m.occurred_at)+(m.time_source==='receipt'?' · לפי זמן הקליטה':'');
 const dir=el('td','c-dir');const badge=el('span','dir '+m.direction);badge.append(icon(m.direction),m.direction==='in'?'נכנסת':'יוצאת');dir.append(badge);
 const peer=el('td','c-peer');const pb=el('button','peer phone',local(m.peer_number));pb.type='button';pb.dataset.peer=m.peer_number;pb.title='כל ההודעות עם '+m.peer_number;peer.append(pb);
 const num=el('td','c-num');const label=labels.get(m.system_number);num.append(el('span',label?'num-label':'num-label phone',label||local(m.system_number)));if(label)num.append(el('span','num-sub phone',local(m.system_number)));
 const msg=el('td','c-msg');msg.append(el('div','body',m.body));
 if(open){const det=el('div','details');det.append(fact('נקלטה',fullFmt.format(m.received_at)));if(m.time_source==='receipt')det.append(fact('זמן ההודעה','לפי זמן הקליטה'));
  if(m.sent_by)det.append(fact('נשלחה על ידי',m.sent_by));if(m.provider_message_id)det.append(fact('מזהה ספק',m.provider_message_id));
  const acts=el('div','actions');if(canSend(m.system_number))acts.append(act('reply','השב'));acts.append(act('copy','העתקת הטקסט'),act('chat','כל השיחה'));det.append(acts);msg.append(det);}
 const st=el('td','c-status');const s=m.direction==='out'&&STATUS[m.submission_status];if(s){const b=el('span','badge '+s[1]);b.title=s[3];b.append(icon(s[2]),s[0]);st.append(b);}else st.append(el('span','dash','—'));
 tr.append(time,dir,peer,num,msg,st);return tr;}
function fact(label,value){const e=el('span');e.append(el('b','',label),value);return e;}
function act(name,label){const b=el('button','act');b.type='button';b.dataset.act=name;b.append(icon(name),label);return b;}

function ui(){if(document.activeElement!==$('q'))$('q').value=state.q;
 for(const b of document.querySelectorAll('[data-dir]'))b.setAttribute('aria-pressed',String(b.dataset.dir===state.dir));
 $('number').value=state.number;$('status').value=state.status;$('range').value=state.range;$('custom').hidden=state.range!=='custom';$('from').value=state.from;$('to').value=state.to;
 for(const th of document.querySelectorAll('th[data-sort]')){const on=th.dataset.sort===state.sort;th.setAttribute('aria-sort',on?(state.order==='asc'?'ascending':'descending'):'none');th.querySelector('.sort-i').replaceChildren(icon(on?state.order:'sort'));}
 $('sort-m').value=state.sort+':'+state.order;
 const chips=$('chips');chips.replaceChildren();
 if(state.peer){const c=el('span','chip');c.append('שיחה עם ',el('span','phone',local(state.peer)));const x=el('button');x.type='button';x.title='הסרת הסינון';x.setAttribute('aria-label','הסרת סינון השיחה');x.append(icon('close'));x.addEventListener('click',function(){set('peer','');});c.append(x);chips.append(c);}
 if(filtered()){const b=el('button','ghost','ניקוי סינון');b.type='button';b.addEventListener('click',clearAll);chips.append(b);}}
function set(k,v){if(state[k]===v)return;state[k]=v;load();}
function openPeer(n){state.peer=n;if(state.sort==='peer'){state.sort='time';state.order='desc';}load();}
function clearAll(){state=Object.assign({},DEF,{sort:state.sort,order:state.order});$('q').value='';load();}
function toggle(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);render();const c=cache.get(id);if(c&&document.activeElement!==c.tr)c.tr.focus({preventScroll:true});}
function copy(text){if(!navigator.clipboard){toast('ההעתקה אינה נתמכת בדפדפן זה');return;}navigator.clipboard.writeText(text).then(function(){toast('הטקסט הועתק');},function(){toast('ההעתקה נכשלה');});}

$('q').addEventListener('input',function(){clearTimeout(debounce);debounce=setTimeout(function(){set('q',$('q').value.trim());},350);});
$('filters').addEventListener('submit',function(e){e.preventDefault();clearTimeout(debounce);set('q',$('q').value.trim());});
for(const b of document.querySelectorAll('[data-dir]'))b.addEventListener('click',function(){set('dir',b.dataset.dir);});
$('number').addEventListener('change',function(){set('number',this.value);});
$('status').addEventListener('change',function(){set('status',this.value);});
$('range').addEventListener('change',function(){state.from='';state.to='';set('range',this.value);});
$('from').addEventListener('change',function(){set('from',DATE.test(this.value)?this.value:'');});
$('to').addEventListener('change',function(){set('to',DATE.test(this.value)?this.value:'');});
$('sort-m').addEventListener('change',function(){const v=this.value.split(':');state.sort=v[0];state.order=v[1];load();});
for(const th of document.querySelectorAll('th[data-sort]'))th.querySelector('button').addEventListener('click',function(){const s=th.dataset.sort;if(state.sort===s)state.order=state.order==='asc'?'desc':'asc';else{state.sort=s;state.order=s==='time'?'desc':'asc';}load();});
$('empty-clear').addEventListener('click',clearAll);
$('reload').addEventListener('click',function(){location.reload();});
$('more').addEventListener('click',more);
if('IntersectionObserver' in window)new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting;}))more();},{rootMargin:'200px'}).observe($('more-row'));
$('rows').addEventListener('click',function(e){const t=e.target;const pb=t.closest('button.peer');if(pb){openPeer(pb.dataset.peer);return;}
 const tr=t.closest('tr');const m=tr&&rows.get(Number(tr.dataset.id));if(!m)return;const a=t.closest('button[data-act]');
 if(a){if(a.dataset.act==='copy')copy(m.body);else if(a.dataset.act==='reply')openCompose(m.system_number,m.peer_number);else openPeer(m.peer_number);return;}
 if(t.closest('.details')||String(getSelection()).length)return;toggle(m.id);});
$('rows').addEventListener('keydown',function(e){if(e.target.tagName==='TR'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(Number(e.target.dataset.id));}});
document.addEventListener('keydown',function(e){const tag=document.activeElement&&document.activeElement.tagName;if(e.key==='/'&&tag!=='INPUT'&&tag!=='SELECT'&&tag!=='TEXTAREA'){e.preventDefault();$('q').focus();}});
document.addEventListener('visibilitychange',function(){if(document.hidden)return;unseen=0;title();clearTimeout(timer);tick().finally(schedule);});

// Compose. The send ID is created when the panel opens and kept across retries of a failed request,
// so the server can tell a retry from a new send; it is only replaced after a send the provider rejected.
const C={id:null,rows:null,file:'',header:false,imported:[],confirm:false,sending:false};
function senders(){return ME?ME.numbers.filter(function(n){return n.can_send;}):[];}
function canSend(number){return senders().some(function(n){return n.number===number;});}
function openCompose(from,to){const list=senders();if(!list.length)return;const sel=$('c-from');sel.replaceChildren();
 for(const n of list){const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;sel.append(o);}if(from&&canSend(from))sel.value=from;
 Object.assign(C,{id:crypto.randomUUID(),rows:null,file:'',imported:[],confirm:false,sending:false});
 $('c-to').value=to?local(to):'';$('c-body').value='';$('c-import').hidden=true;$('c-error').hidden=true;$('c-file-btn').hidden=!ME.can_bulk_send;
 updateCompose();$('compose').showModal();(to?$('c-body'):$('c-to')).focus();}
function recipients(){const typed=$('c-to').value.split(/[,;\n]+/).map(function(s){return s.trim();}).filter(Boolean);const all=typed.concat(C.imported);const valid=new Set(),invalid=[];
 for(const r of all){const n=normalize(r);if(n&&(ME.settings.allow_international||n.indexOf('+972')===0))valid.add(n);else invalid.push(r);}
 return {list:Array.from(valid),invalid:invalid,duplicates:all.length-invalid.length-valid.size};}
// Micropay bills 70 characters for a single Hebrew SMS and 67 per part after that (140 and 134 in English).
function segments(text){const len=text.replace(/\n/g,'\r\n').length;if(!len)return 0;const uni=/[^\x00-\x7f]/.test(text);return len<=(uni?70:140)?1:Math.ceil(len/(uni?67:134));}
function finalBody(n){let b=$('c-body').value;const t=ME.settings.optout_text;if(n>1&&t&&b.indexOf(t)<0)b+='\n'+t;return b;}
function updateCompose(){const r=recipients();const n=r.list.length;const body=finalBody(n);const seg=segments(body);
 $('c-summary').textContent=n?nf.format(n)+(n===1?' נמען':' נמענים')+(r.duplicates?' · '+(r.duplicates===1?'כפילות אחת הוסרה':nf.format(r.duplicates)+' כפילויות הוסרו'):''):'עדיין לא הוזנו נמענים';
 $('c-invalid').hidden=!r.invalid.length;$('c-invalid').textContent=r.invalid.length?(r.invalid.length===1?'מספר לא תקין שלא יישלח: ':nf.format(r.invalid.length)+' מספרים לא תקינים שלא יישלחו: ')+r.invalid.slice(0,6).join(', ')+(r.invalid.length>6?'…':''):'';
 $('c-count').textContent=body.length?nf.format(body.length)+' / 1,000 תווים · '+seg+' SMS לנמען':'';
 $('c-optout').hidden=!(n>1&&ME.settings.optout_text);$('c-optout').textContent='בשליחה לכמה נמענים יתווסף בסוף ההודעה: '+ME.settings.optout_text;
 $('c-usage').textContent=ME.daily_limit===null?'':'נוצלו '+nf.format(ME.sent_24h)+' מתוך '+nf.format(ME.daily_limit)+' ב-24 השעות האחרונות';
 const problem=!n?'':n>1&&!ME.can_bulk_send?'אין לך הרשאה לשלוח ליותר מנמען אחד':n>ME.settings.max_recipients?'אפשר לשלוח עד '+nf.format(ME.settings.max_recipients)+' נמענים בכל פעם':ME.daily_limit!==null&&ME.sent_24h+n>ME.daily_limit?'השליחה תחרוג מהמגבלה היומית שלך':body.length>1000?'ההודעה ארוכה מדי':'';
 const ready=n>0&&$('c-body').value.trim().length>0&&!problem;
 $('c-total').textContent=problem||(ready?'סה״כ כ-'+nf.format(seg*n)+' SMS':'');$('c-total').className='hint'+(problem?' bad':'');
 $('c-send').disabled=!ready||C.sending;if(!C.sending)$('c-send-text').textContent=C.confirm?'אישור שליחה ל-'+nf.format(n)+(n===1?' נמען':' נמענים'):'המשך';}
function edited(){C.confirm=false;updateCompose();}
function composeError(text){$('c-error').hidden=false;$('c-error').textContent=text;}
async function readRows(file){const buf=await file.arrayBuffer();if(/[.]xlsx$/i.test(file.name))return readXlsx(buf);let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch(e){txt=new TextDecoder('windows-1255').decode(buf);}
 const lines=txt.split(/\r?\n/).filter(function(l){return l.trim();}).slice(0,20001);if(!lines.length)return [];
 const counts=[',',';','\t'].map(function(d){return lines[0].split(d).length;});const delim=[',',';','\t'][counts.indexOf(Math.max.apply(null,counts))];
 return lines.map(function(l){return splitLine(l,delim);});}
function splitLine(line,d){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}else if(ch==='"')q=true;else if(ch===d){out.push(cur.trim());cur='';}else cur+=ch;}out.push(cur.trim());return out;}
// Minimal .xlsx reader: unzip with the browser's DecompressionStream and read the first worksheet's cells.
async function readXlsx(buf){const u8=new Uint8Array(buf),dv=new DataView(buf);let end=-1;for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){end=i;break;}if(end<0)throw new Error('קובץ Excel לא תקין');
 const files={};let p=dv.getUint32(end+16,true);const count=dv.getUint16(end+10,true);
 for(let k=0;k<count;k++){if(dv.getUint32(p,true)!==0x02014b50)throw new Error('קובץ Excel לא תקין');const nameLen=dv.getUint16(p+28,true);files[new TextDecoder().decode(u8.subarray(p+46,p+46+nameLen))]={method:dv.getUint16(p+10,true),size:dv.getUint32(p+20,true),offset:dv.getUint32(p+42,true)};p+=46+nameLen+dv.getUint16(p+30,true)+dv.getUint16(p+32,true);}
 async function read(name){const f=files[name];if(!f)return null;const start=f.offset+30+dv.getUint16(f.offset+26,true)+dv.getUint16(f.offset+28,true);const data=u8.subarray(start,start+f.size);if(f.method===0)return new TextDecoder().decode(data);if(f.method!==8)throw new Error('קובץ Excel לא נתמך');return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();}
 const xml=function(s){return new DOMParser().parseFromString(s,'application/xml');};const shared=[];const ss=await read('xl/sharedStrings.xml');
 if(ss)for(const si of xml(ss).getElementsByTagName('si'))shared.push(Array.from(si.getElementsByTagName('t')).map(function(t){return t.textContent;}).join(''));
 const sheet=Object.keys(files).filter(function(n){return /^xl[/]worksheets[/]sheet[0-9]+[.]xml$/.test(n);}).sort(function(a,b){return a.length-b.length||(a<b?-1:1);})[0];if(!sheet)throw new Error('לא נמצא גיליון בקובץ');
 const out=[];for(const r of Array.from(xml(await read(sheet)).getElementsByTagName('row')).slice(0,20001)){const cells=[];
  for(const c of r.getElementsByTagName('c')){let col=0;for(const ch of (c.getAttribute('r')||'').replace(/[0-9]/g,''))col=col*26+ch.charCodeAt(0)-64;col=col?col-1:cells.length;
   const t=c.getAttribute('t');const v=c.getElementsByTagName('v')[0];let val=t==='s'?shared[Number(v&&v.textContent)]||'':t==='inlineStr'?Array.from(c.getElementsByTagName('t')).map(function(x){return x.textContent;}).join(''):v?v.textContent:'';
   if(!t&&/e/i.test(val))val=Number(val).toFixed(0);cells[col]=String(val||'');}
  out.push(Array.from(cells,function(x){return x||'';}));}
 return out;}
function pickColumn(){const sample=C.rows.slice(0,200);const width=Math.min(50,Math.max.apply(null,sample.map(function(r){return r.length;})));const scores=[];
 for(let c=0;c<width;c++){let s=0;for(const r of sample)if(r[c]&&normalize(r[c]))s++;scores.push(s);}
 const best=scores.indexOf(Math.max.apply(null,scores));const head=C.rows.length>1&&!normalize(C.rows[0][best]||'');const sel=$('c-column');sel.replaceChildren();
 for(let c=0;c<width;c++){const o=el('option','',(head&&C.rows[0][c]?C.rows[0][c]:'עמודה '+(c+1))+(scores[c]?' ('+scores[c]+')':''));o.value=String(c);sel.append(o);}
 sel.value=String(best);applyColumn();}
function applyColumn(){const c=Number($('c-column').value);C.header=C.rows.length>1&&!normalize(C.rows[0][c]||'');
 C.imported=C.rows.slice(C.header?1:0).map(function(r){return r[c]||'';}).filter(function(v){return v.trim();});
 $('c-import').hidden=false;$('c-import-info').textContent=C.file+' · '+nf.format(C.imported.length)+' שורות';edited();}
$('c-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;$('c-error').hidden=true;
 if(f.size>5242880){composeError('הקובץ גדול מדי (עד 5MB)');return;}
 try{const r=await readRows(f);if(!r.length)throw new Error('הקובץ ריק');C.rows=r;C.file=f.name;pickColumn();}catch(e){composeError('לא ניתן לקרוא את הקובץ: '+(e.message||e));}});
$('c-column').addEventListener('change',applyColumn);
$('c-import-clear').addEventListener('click',function(){C.rows=null;C.imported=[];$('c-import').hidden=true;edited();});
for(const id of ['c-to','c-body'])$(id).addEventListener('input',edited);
$('c-from').addEventListener('change',edited);
for(const id of ['c-close','c-cancel'])$(id).addEventListener('click',function(){$('compose').close();});
$('c-form').addEventListener('submit',async function(e){e.preventDefault();if(C.sending)return;const r=recipients();if(!r.list.length||$('c-send').disabled)return;
 if(!C.confirm){C.confirm=true;updateCompose();return;}
 C.sending=true;$('c-send').disabled=true;$('c-send-text').textContent='שולח…';$('c-error').hidden=true;
 try{const d=await post('/api/send',{id:C.id,system_number:$('c-from').value,recipients:r.list,body:$('c-body').value});
  if(d.status==='rejected'){C.id=crypto.randomUUID();composeError('הספק דחה את השליחה'+(d.error?': '+d.error:''));}
  else{$('compose').close();toast(d.duplicate?'השליחה הזו כבר בוצעה':d.status==='accepted'?'נשלח ל-'+nf.format(d.sent)+(d.sent===1?' נמען':' נמענים')+(d.skipped&&d.skipped.opted_out?' · '+nf.format(d.skipped.opted_out)+' ברשימת ההסרה דולגו':''):'ההודעה הועברה לספק אך התוצאה לא ידועה. בדקו בטבלה לפני שליחה חוזרת.');}
  loadMe().catch(function(){});tick();}
 catch(err){composeError(message(err));}
 finally{C.sending=false;C.confirm=false;updateCompose();}});
$('new').addEventListener('click',function(){openCompose();});

readUrl();title();
(async function(){try{await loadMe();noNumbers=!ME.numbers.length;
  for(const n of ME.numbers){labels.set(n.number,n.label);const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;$('number').append(o);}
  $('number').hidden=ME.numbers.length<2&&!state.number;$('new').hidden=!senders().length;}
 catch(e){fail(e,true);}
 if(!stopped)await load();schedule();})();
`;
export function page(nonce:string):string { return shell(nonce,'הודעות SMS',css,body,script,'app'); }

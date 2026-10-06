// Browser code lives in String.raw templates, so it must not contain backticks or "${".
const css = String.raw`
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--field:#fff;--ink:#0b0b0b;--ink2:#52514e;--muted:#6f6d68;--line:#e1e0d9;--ring:rgba(11,11,11,.1);--hover:rgba(11,11,11,.035);--accent:#2a78d6;--accent-ink:#1d5fb0;--in:#2a78d6;--out:#eb6834;--good:#0ca30c;--warn:#fab219;--bad:#d03b3b;--neutral:#898781;--shadow:0 1px 2px rgba(11,11,11,.04),0 2px 12px rgba(11,11,11,.04)}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--field:#222221;--ink:#fff;--ink2:#c3c2b7;--muted:#9a988f;--line:#2c2c2a;--ring:rgba(255,255,255,.1);--hover:rgba(255,255,255,.045);--accent:#3987e5;--accent-ink:#8bb8f0;--in:#3987e5;--out:#d95926;--shadow:none}}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:14.5px/1.5 system-ui,-apple-system,"Segoe UI","Noto Sans Hebrew",Arial,sans-serif}
button,input,select{font:inherit;color:inherit}
[hidden]{display:none!important}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.i{width:16px;height:16px;flex:none}
.wrap{width:100%;max-width:1320px;margin:0 auto;padding:0 20px}
.top{background:var(--surface);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding-block:10px}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.logo{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--accent);color:#fff}
.logo .i{width:20px;height:20px}
h1{margin:0;font-size:17px;font-weight:650;letter-spacing:-.01em}
.sub{margin:0;font-size:12.5px;color:var(--muted)}
.top-end{display:flex;align-items:center;gap:12px;min-width:0}
.live{display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border:1px solid var(--ring);border-radius:999px;background:var(--hover);font-size:13px;color:var(--ink2);white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;background:var(--neutral)}
.live.ok .dot{background:var(--good);animation:pulse 2s ease-out infinite}
.live.err .dot{background:var(--bad)}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(12,163,12,.45)}70%,100%{box-shadow:0 0 0 7px rgba(12,163,12,0)}}
.who{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--muted)}
main.wrap{display:flex;flex-direction:column;gap:14px;padding-block:16px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0}
.stat{padding:12px 16px;border:1px solid var(--ring);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
.stat dt{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink2)}
.stat dd{margin:2px 0 0;font-size:26px;font-weight:650;letter-spacing:-.02em}
.key{width:8px;height:8px;border-radius:2px;background:var(--in)}
.key.out{background:var(--out)}
.panel{position:relative;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--ring);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)}
.progress{position:absolute;top:0;inset-inline:0;height:2px;overflow:hidden;opacity:0;transition:opacity .2s;z-index:3}
.progress::after{content:"";position:absolute;inset-block:0;width:30%;background:var(--accent);animation:slide 1.1s ease-in-out infinite}
.busy .progress{opacity:1}
@keyframes slide{from{inset-inline-start:-30%}to{inset-inline-start:100%}}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line)}
.field,.toolbar select,.custom input{height:36px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:var(--field)}
.toolbar select{cursor:pointer}
.search{display:flex;align-items:center;gap:8px;flex:1 1 240px;max-width:360px;color:var(--muted);cursor:text}
.search input{flex:1;min-width:0;height:34px;border:0;outline:0;background:transparent;color:var(--ink)}
.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.seg{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--field)}
.seg button{padding:4px 12px;border:0;border-radius:7px;background:transparent;color:var(--ink2);cursor:pointer}
.seg button:hover{color:var(--ink)}
.seg button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--ink);font-weight:600}
.custom{display:inline-flex;align-items:center;gap:6px;color:var(--muted)}
.ghost{height:36px;padding:0 12px;border:0;border-radius:9px;background:transparent;color:var(--accent-ink);font-weight:550;cursor:pointer}
.ghost:hover{background:var(--hover)}
.sort-m{display:none}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px}
.chips:not(:empty){padding-block:8px;border-bottom:1px solid var(--line)}
.chips .ghost{height:28px;padding:0 8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding-block:3px;padding-inline:12px 4px;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);font-size:13px}
.chip button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:var(--ink2);cursor:pointer}
.chip button:hover{background:var(--hover)}
.banner{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bad) 10%,transparent);font-size:13.5px}
.banner .ghost{margin-inline-start:auto}
.table-wrap{position:relative;overflow:auto}
table{width:100%;min-width:880px;border-collapse:separate;border-spacing:0;table-layout:fixed;transition:opacity .15s}
.busy.has-rows table{opacity:.55}
col.c-time{width:112px}col.c-dir{width:100px}col.c-peer{width:144px}col.c-num{width:160px}col.c-status{width:124px}
th{position:sticky;top:0;z-index:2;padding:0;border-bottom:1px solid var(--line);background:var(--surface);text-align:start;font-size:12.5px;font-weight:600;color:var(--ink2)}
th>button,th>span{display:flex;align-items:center;gap:6px;width:100%;padding:10px 12px;border:0;background:transparent;font-weight:inherit;text-align:start}
th>button{cursor:pointer}
th>button:hover{background:var(--hover);color:var(--ink)}
th[aria-sort=ascending],th[aria-sort=descending]{color:var(--ink)}
.sort-i{display:inline-flex;color:var(--muted)}
.sort-i .i{width:14px;height:14px}
th[aria-sort=ascending] .sort-i,th[aria-sort=descending] .sort-i{color:var(--accent)}
td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr{cursor:pointer}
tbody tr:hover>td{background:var(--hover)}
tbody tr:focus-visible{outline-offset:-2px}
tbody tr>td:first-child{border-inline-start:3px solid transparent}
tr.in>td:first-child{border-inline-start-color:var(--in)}
tr.out>td:first-child{border-inline-start-color:var(--out)}
tr.open>td{background:color-mix(in srgb,var(--accent) 5%,transparent)}
tr.fresh>td{animation:flash 2.6s ease-out}
@keyframes flash{from{background:color-mix(in srgb,var(--accent) 20%,transparent)}to{background:transparent}}
.c-time{white-space:nowrap;font-variant-numeric:tabular-nums}
.day{display:block;font-weight:550}
.clock{display:block;font-size:12.5px;color:var(--muted)}
.dir{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,var(--in) 12%,transparent);font-size:12.5px;font-weight:550;color:var(--ink2)}
.dir .i{width:14px;height:14px;color:var(--in)}
.dir.out{background:color-mix(in srgb,var(--out) 13%,transparent)}
.dir.out .i{color:var(--out)}
.phone{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.peer{padding:0;border:0;background:transparent;color:var(--accent-ink);font-weight:550;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px}
.peer:hover{text-decoration-color:currentColor}
.num-label{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.num-sub{display:block;font-size:12.5px;color:var(--muted)}
.body{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext}
tr.open .body{display:block;overflow:visible}
.details{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:12.5px;color:var(--ink2);cursor:auto}
.details b{margin-inline-end:6px;font-weight:600;color:var(--muted)}
.actions{display:flex;gap:6px;margin-inline-start:auto}
.act{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--field);font-size:12.5px;cursor:pointer}
.act:hover{border-color:var(--accent)}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:550;color:var(--ink2)}
.badge .i{width:15px;height:15px}
.badge.good .i{color:var(--good)}.badge.warn .i{color:var(--warn)}.badge.bad .i{color:var(--bad)}.badge.neutral .i{color:var(--neutral)}
.dash{color:var(--muted)}
.skeleton{padding:4px 14px}
.skeleton div{height:46px;margin:8px 0;border-radius:8px;background:linear-gradient(90deg,var(--hover),color-mix(in srgb,var(--ink) 7%,transparent),var(--hover));background-size:200% 100%;animation:shimmer 1.2s linear infinite}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.empty{display:grid;justify-items:center;gap:6px;padding:56px 16px;text-align:center;color:var(--ink2)}
.empty p{margin:0}
.empty>.i{width:36px;height:36px;margin-bottom:6px;color:var(--muted)}
.empty-title{font-weight:600;color:var(--ink)}
.more-row{display:flex;justify-content:center;padding:14px}
.more{height:36px;padding:0 16px;border:1px solid var(--line);border-radius:9px;background:var(--field);cursor:pointer}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;padding:9px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.toast{position:fixed;bottom:20px;left:50%;z-index:10;transform:translateX(-50%);padding:8px 16px;border-radius:9px;background:var(--ink);color:var(--page);font-size:13.5px;box-shadow:0 4px 18px rgba(0,0,0,.18)}
@media (min-width:761px) and (min-height:560px){body{display:flex;flex-direction:column;height:100dvh}main.wrap{flex:1;min-height:0}.panel{flex:1;min-height:0}.table-wrap{flex:1;min-height:0}}
@media (max-width:760px){
.wrap{padding:0 12px}.who{display:none}.sub{display:none}
.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stat{padding:10px 12px}.stat dd{font-size:22px}
.search{flex-basis:100%;max-width:none}.seg{flex:1 1 100%}.seg button{flex:1}.sort-m{display:block}.toolbar select{flex:1 1 calc(50% - 4px);min-width:0}.custom{flex:1 1 100%}.custom input{flex:1;min-width:0}
.table-wrap{overflow:visible}table{min-width:0}colgroup,thead{display:none}table,tbody{display:block}
tbody tr{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"dir peer time" "msg msg msg" "num num status";gap:8px 10px;padding:12px 14px;border-bottom:1px solid var(--line);border-inline-start:3px solid transparent}
tr.in{border-inline-start-color:var(--in)}tr.out{border-inline-start-color:var(--out)}
td{display:block;min-width:0;padding:0;border:0}
tbody tr>td:first-child{border:0}
tbody tr:hover>td,tr.open>td{background:none}
tr.open{background:color-mix(in srgb,var(--accent) 5%,transparent)}
tr.fresh{animation:flash 2.6s ease-out}tr.fresh>td{animation:none}
.c-time{grid-area:time;text-align:end}.c-dir{grid-area:dir}.c-peer{grid-area:peer;align-self:center}.c-msg{grid-area:msg}.c-status{grid-area:status}
.c-num{grid-area:num;display:flex;align-items:baseline;gap:6px;min-width:0}
.day,.clock,.num-label,.num-sub{display:inline}.clock{margin-inline-start:6px}
.actions{margin-inline-start:0}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
const svg = (paths: string, cls = 'i') => '<svg class="'+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
const chat = '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>';
const html = String.raw`
<header class="top"><div class="wrap">
 <div class="brand"><span class="logo">`+svg(chat)+String.raw`</span><div><h1>הודעות SMS</h1><p class="sub">צפייה בלבד · מצב הגשה אינו אישור מסירה</p></div></div>
 <div class="top-end"><span class="live" id="live" role="status" title="הנתונים מתעדכנים אוטומטית כל 5 שניות"><span class="dot"></span><span id="live-text">מתחבר…</span></span><span class="who" id="who"></span></div>
</div></header>
<main class="wrap">
 <dl class="stats" aria-label="סיכום לפי הסינון הנוכחי">
  <div class="stat"><dt>הודעות</dt><dd id="s-total">—</dd></div>
  <div class="stat"><dt><span class="key"></span>נכנסות</dt><dd id="s-in">—</dd></div>
  <div class="stat"><dt><span class="key out"></span>יוצאות</dt><dd id="s-out">—</dd></div>
  <div class="stat"><dt>לקוחות</dt><dd id="s-peers">—</dd></div>
 </dl>
 <section class="panel" id="panel" aria-label="הודעות">
  <div class="progress"></div>
  <form class="toolbar" id="filters" role="search">
   <label class="field search">`+svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>')+String.raw`<input id="q" type="search" maxlength="200" placeholder="חיפוש בטקסט או במספר" aria-label="חיפוש בטקסט או במספר"></label>
   <div class="seg" role="group" aria-label="כיוון"><button type="button" data-dir="" aria-pressed="true">הכל</button><button type="button" data-dir="in" aria-pressed="false">נכנסות</button><button type="button" data-dir="out" aria-pressed="false">יוצאות</button></div>
   <select id="number" aria-label="מספר מערכת"><option value="">כל המספרים</option></select>
   <select id="status" aria-label="סטטוס הגשה"><option value="">כל הסטטוסים</option><option value="pending">בתהליך</option><option value="accepted">התקבלה</option><option value="rejected">נדחתה</option><option value="unknown">לא ידוע</option></select>
   <select id="range" aria-label="טווח תאריכים"><option value="">כל התאריכים</option><option value="today">היום</option><option value="7">7 הימים האחרונים</option><option value="30">30 הימים האחרונים</option><option value="custom">טווח מותאם…</option></select>
   <span class="custom" id="custom" hidden><input type="date" id="from" aria-label="מתאריך"><span>–</span><input type="date" id="to" aria-label="עד תאריך"></span>
   <select class="sort-m" id="sort-m" aria-label="מיון"><option value="time:desc">החדשות קודם</option><option value="time:asc">הישנות קודם</option><option value="peer:asc">לפי לקוח</option><option value="number:asc">לפי מספר מערכת</option><option value="direction:asc">לפי כיוון</option><option value="status:asc">לפי סטטוס</option></select>
  </form>
  <div class="chips" id="chips"></div>
  <div class="banner" id="error" role="alert" hidden><span id="error-text"></span><button type="button" class="ghost" id="reload" hidden>רענון הדף</button></div>
  <div class="table-wrap" id="scroll">
   <table><colgroup><col class="c-time"><col class="c-dir"><col class="c-peer"><col class="c-num"><col><col class="c-status"></colgroup>
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
   <div class="empty" id="empty" hidden>`+svg(chat)+String.raw`<p class="empty-title" id="empty-title"></p><p id="empty-sub"></p><button type="button" class="ghost" id="empty-clear" hidden>ניקוי סינון</button></div>
   <div class="more-row" id="more-row" hidden><button type="button" class="more" id="more">טעינת הודעות נוספות</button></div>
  </div>
  <div class="foot"><span id="count"></span><span>הזמנים לפי שעון ישראל · הודעות יוצאות מוצגות רק ממערכות שמדווחות עליהן<span id="updated"></span></span></div>
 </section>
</main>
<div class="toast" id="toast" role="status" hidden></div>
`;
const script = String.raw`
'use strict';
const $=id=>document.getElementById(id);
const TZ='Asia/Jerusalem';
const ICONS={in:'<path d="M12 5v14M6 13l6 6 6-6"/>',out:'<path d="M12 19V5M6 11l6-6 6 6"/>',check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',x:'<circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.7a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.3M12 16.5v.1"/>',chat:'<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>',copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',sort:'<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4"/>',asc:'<path d="M12 19V5M7 10l5-5 5 5"/>',desc:'<path d="M12 5v14M7 14l5 5 5-5"/>',close:'<path d="M8 8l8 8M16 8l-8 8"/>'};
const STATUS={pending:['בתהליך','warn','clock','ההגשה בתהליך'],accepted:['התקבלה','good','check','ההגשה התקבלה אצל הספק. זה אינו אישור מסירה'],rejected:['נדחתה','bad','x','ההגשה נדחתה'],unknown:['לא ידוע','neutral','question','תוצאת ההגשה לא ידועה']};
const DEF={q:'',dir:'',number:'',status:'',range:'',from:'',to:'',peer:'',sort:'time',order:'desc'};
const ALLOWED={dir:['','in','out'],status:['','pending','accepted','rejected','unknown'],range:['','today','7','30','custom'],sort:['time','direction','peer','number','status'],order:['asc','desc']};
const DATE=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
let state=Object.assign({},DEF);
const rows=new Map(),cache=new Map(),fresh=new Set(),expanded=new Set(),labels=new Map();
let next=null,sync=null,boundary=null,maxId=null,total=null,gen=0,loading=false,polling=false,paging=false,stopped=false,fails=0,unseen=0,timer=0,debounce=0,toastTimer=0,noNumbers=false;

function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function icon(name){const t=document.createElement('template');t.innerHTML='<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>';return t.content.firstChild;}

const nf=new Intl.NumberFormat('he-IL');
const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
const clockFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const dayFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric'});
const yearFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric',year:'2-digit'});
const fullFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,dateStyle:'full',timeStyle:'medium'});
const secFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'});
function zoned(ms){const p={};for(const x of parts.formatToParts(ms))p[x.type]=Number(x.value);return p;}
function pad(n){return String(n).padStart(2,'0');}
function ymd(ms){const p=zoned(ms);return p.year+'-'+pad(p.month)+'-'+pad(p.day);}
function today(){return ymd(Date.now());}
function shift(day,days){const a=day.split('-').map(Number);return new Date(Date.UTC(a[0],a[1]-1,a[2]+days)).toISOString().slice(0,10);}
function offset(ms){const p=zoned(ms);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-(ms-ms%1000);}
// Midnight of a calendar day in Israel time, whatever the browser's own timezone is.
function midnight(day){const a=day.split('-').map(Number);const guess=Date.UTC(a[0],a[1]-1,a[2]);return guess-offset(guess-offset(guess));}
function when(ms,now){const d=ymd(ms);const day=d===now?'היום':d===shift(now,-1)?'אתמול':(d.slice(0,4)===now.slice(0,4)?dayFmt:yearFmt).format(ms);return [day,clockFmt.format(ms)];}
function local(n){if(!/^[+]972[0-9]{8,9}$/.test(n))return n;const l='0'+n.slice(4);return l.length===10?l.slice(0,3)+'-'+l.slice(3,6)+'-'+l.slice(6):l.slice(0,2)+'-'+l.slice(2,5)+'-'+l.slice(5);}

function readUrl(){const p=new URLSearchParams(location.search);for(const k in DEF){const v=p.get(k);if(v!==null)state[k]=v.slice(0,200);}
 for(const k in ALLOWED)if(!ALLOWED[k].includes(state[k]))state[k]=DEF[k];if(!DATE.test(state.from))state.from='';if(!DATE.test(state.to))state.to='';}
function writeUrl(){const p=new URLSearchParams();for(const k in DEF)if(state[k]!==DEF[k])p.set(k,state[k]);const s=p.toString();history.replaceState(null,'',s?'?'+s:location.pathname);}
function filtered(){return !!(state.q||state.dir||state.number||state.status||state.range||state.peer);}
function bounds(){const t=today();if(state.range==='today')return [midnight(t)];if(state.range==='7'||state.range==='30')return [midnight(shift(t,1-Number(state.range)))];
 if(state.range==='custom')return [state.from?midnight(state.from):undefined,state.to?midnight(shift(state.to,1)):undefined];return [];}
function query(withStatus){const p=new URLSearchParams();if(state.number)p.set('system_number',state.number);if(state.peer)p.set('peer_number',state.peer);if(state.q)p.set('q',state.q);if(state.dir)p.set('direction',state.dir);if(state.status&&withStatus)p.set('status',state.status);
 const b=bounds();if(b[0]!==undefined)p.set('from',String(b[0]));if(b[1]!==undefined)p.set('to',String(b[1]));p.set('sort',state.sort);p.set('order',state.order);p.set('limit','100');return p;}

// An expired Access session answers with a redirect to the login page instead of JSON.
async function get(path){let r;try{r=await fetch(path,{cache:'no-store',credentials:'same-origin',redirect:'manual',headers:{Accept:'application/json'}});}catch(e){throw new Error('offline');}
 if(r.type==='opaqueredirect'||r.status===401)throw new Error('auth');let d;try{d=await r.json();}catch(e){throw new Error(r.ok?'auth':'HTTP '+r.status);}
 if(!r.ok)throw new Error(d&&d.error?d.error:'HTTP '+r.status);return d;}
function live(kind,text){$('live').className='live '+kind;$('live-text').textContent=text;}
function ok(){fails=0;live('ok','עדכון חי');$('updated').textContent=' · עודכן '+secFmt.format(Date.now());if(!$('error').dataset.sticky)$('error').hidden=true;}
function showError(text,reload){$('error').hidden=false;$('error-text').textContent=text;$('reload').hidden=!reload;$('error').dataset.sticky=reload?'1':'';}
function fail(e,initial){fails++;const m=e&&e.message||'';
 if(m==='auth'){stopped=true;live('err','נדרשת התחברות');showError('פג תוקף ההתחברות. יש לרענן את הדף כדי להתחבר מחדש.',true);return;}
 if(m==='offline'){live('err','אין חיבור');if(initial||fails>=3)showError('אין חיבור לשרת. מנסים שוב אוטומטית…');return;}
 live('err','שגיאה');showError('טעינת הנתונים נכשלה: '+m);}
function busy(on){$('panel').classList.toggle('busy',on);}
function title(){document.title=(unseen?'('+unseen+') ':'')+'הודעות SMS';}
function toast(text){const t=$('toast');t.textContent=text;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},1800);}

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
function schedule(){clearTimeout(timer);if(stopped)return;timer=setTimeout(function(){tick().finally(schedule);},document.hidden?30000:5000);}

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
  if(m.provider_message_id)det.append(fact('מזהה ספק',m.provider_message_id));const acts=el('div','actions');acts.append(act('copy','העתקת הטקסט'),act('chat','כל השיחה'));det.append(acts);msg.append(det);}
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
 if(a){if(a.dataset.act==='copy')copy(m.body);else openPeer(m.peer_number);return;}if(t.closest('.details')||String(getSelection()).length)return;toggle(m.id);});
$('rows').addEventListener('keydown',function(e){if(e.target.tagName==='TR'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(Number(e.target.dataset.id));}});
document.addEventListener('keydown',function(e){const tag=document.activeElement&&document.activeElement.tagName;if(e.key==='/'&&tag!=='INPUT'&&tag!=='SELECT'&&tag!=='TEXTAREA'){e.preventDefault();$('q').focus();}});
document.addEventListener('visibilitychange',function(){if(document.hidden)return;unseen=0;title();clearTimeout(timer);tick().finally(schedule);});

readUrl();title();
(async function(){try{const d=await get('/api/numbers');$('who').textContent=d.email||'';noNumbers=!d.numbers.length;
  for(const n of d.numbers){labels.set(n.number,n.label);const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;$('number').append(o);}
  $('number').hidden=d.numbers.length<2&&!state.number;}
 catch(e){fail(e,true);}
 if(!stopped)await load();schedule();})();
`;
export function page(nonce:string):string {return '<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>הודעות SMS</title><style nonce="'+nonce+'">'+css+'</style></head><body>'+html+'<script nonce="'+nonce+'">'+script+'</script></body></html>';}

// Shared look and browser helpers for the dashboard pages. Browser code and CSS live in String.raw
// templates, so they must not contain backticks or "${"; text from the network is only rendered with textContent.
export const ICONS: Record<string,string> = {
 in:'<path d="M12 5v14M6 13l6 6 6-6"/>',out:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 x:'<circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.7a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.3M12 16.5v.1"/>',
 chat:'<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>',copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
 reply:'<path d="M10 8L5 12.5 10 17M5.5 12.5H14a5 5 0 0 1 5 5V19"/>',send:'<path d="M4.5 12h11M11 6l6.5 6-6.5 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',
 sort:'<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4"/>',asc:'<path d="M12 19V5M7 10l5-5 5 5"/>',desc:'<path d="M12 5v14M7 14l5 5 5-5"/>',close:'<path d="M8 8l8 8M16 8l-8 8"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',file:'<path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13 3.5V8h5"/>',
 wide:'<path d="M5 6h14M5 12h14M5 18h14"/>',narrow:'<path d="M5 6.5h14M5 10.5h14M5 14.5h14M5 18.5h14"/>',dense:'<path d="M5 5h14M5 8.5h14M5 12h14M5 15.5h14M5 19h14"/>',
};
export const svg = (name: string) => '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>';
const escape = (s: string) => s.replace(/[&<>"']/g, c => '&#'+c.charCodeAt(0)+';');
export const baseCss = String.raw`
:root{--pad-y:11px;--pad-x:12px;--clamp:2;--row-font:14.5px;--card-pad:12px;color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--field:#fff;--ink:#0b0b0b;--ink2:#52514e;--muted:#6f6d68;--line:#e1e0d9;--ring:rgba(11,11,11,.1);--hover:rgba(11,11,11,.035);--accent:#2a78d6;--accent-ink:#1d5fb0;--in:#2a78d6;--out:#eb6834;--good:#0ca30c;--warn:#fab219;--bad:#d03b3b;--neutral:#898781;--shadow:0 1px 2px rgba(11,11,11,.04),0 2px 12px rgba(11,11,11,.04)}
:root[data-density=wide]{--pad-y:17px;--pad-x:14px;--clamp:3;--card-pad:16px}
:root[data-density=dense]{--pad-y:5px;--pad-x:10px;--clamp:1;--row-font:13.5px;--card-pad:8px}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--field:#222221;--ink:#fff;--ink2:#c3c2b7;--muted:#9a988f;--line:#2c2c2a;--ring:rgba(255,255,255,.1);--hover:rgba(255,255,255,.045);--accent:#3987e5;--accent-ink:#8bb8f0;--in:#3987e5;--out:#d95926;--shadow:none}}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:14.5px/1.5 system-ui,-apple-system,"Segoe UI","Noto Sans Hebrew",Arial,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
a{color:var(--accent-ink)}
[hidden]{display:none!important}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.i{width:16px;height:16px;flex:none}
.wrap{width:100%;max-width:1320px;margin:0 auto;padding:0 20px}
.top{background:var(--surface);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:16px;min-height:60px;padding-block:10px}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.logo{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--accent);color:#fff}
.logo .i{width:20px;height:20px}
h1{margin:0;font-size:17px;font-weight:650;letter-spacing:-.01em}
.sub{margin:0;font-size:12.5px;color:var(--muted)}
.nav{display:flex;gap:2px}
.nav a{padding:6px 12px;border-radius:8px;color:var(--ink2);text-decoration:none;font-weight:550}
.nav a:hover{background:var(--hover);color:var(--ink)}
.nav a[aria-current=page]{background:color-mix(in srgb,var(--accent) 13%,transparent);color:var(--ink)}
.top-end{display:flex;align-items:center;gap:12px;min-width:0;margin-inline-start:auto}
.density{display:inline-flex;gap:2px;padding:2px;border:1px solid var(--ring);border-radius:9px}
.density button{display:grid;place-items:center;width:30px;height:28px;border:0;border-radius:7px;background:transparent;color:var(--muted);cursor:pointer}
.density button:hover{color:var(--ink)}
.density button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--ink)}
.live{display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border:1px solid var(--ring);border-radius:999px;background:var(--hover);font-size:13px;color:var(--ink2);white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;background:var(--neutral)}
.live.ok .dot{background:var(--good);animation:pulse 2s ease-out infinite}
.live.err .dot{background:var(--bad)}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(12,163,12,.45)}70%,100%{box-shadow:0 0 0 7px rgba(12,163,12,0)}}
.who{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--muted)}
main.wrap{display:flex;flex-direction:column;gap:14px;padding-block:16px}
.panel{position:relative;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--ring);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)}
.progress{position:absolute;top:0;inset-inline:0;height:2px;overflow:hidden;opacity:0;transition:opacity .2s;z-index:3}
.progress::after{content:"";position:absolute;inset-block:0;width:30%;background:var(--accent);animation:slide 1.1s ease-in-out infinite}
.busy .progress{opacity:1}
@keyframes slide{from{inset-inline-start:-30%}to{inset-inline-start:100%}}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line)}
.field,.toolbar select,.custom input,.fld input,.fld select,textarea{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:var(--field)}
textarea{width:100%;padding:8px 10px;resize:vertical;line-height:1.5}
select{cursor:pointer}
.search{display:flex;align-items:center;gap:8px;flex:1 1 240px;max-width:360px;color:var(--muted);cursor:text}
.search input{flex:1;min-width:0;height:34px;border:0;outline:0;background:transparent;color:var(--ink)}
.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.seg{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--field)}
.seg button{padding:4px 12px;border:0;border-radius:7px;background:transparent;color:var(--ink2);cursor:pointer}
.seg button:hover{color:var(--ink)}
.seg button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--ink);font-weight:600}
.custom{display:inline-flex;align-items:center;gap:6px;color:var(--muted)}
.ghost{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border:0;border-radius:9px;background:transparent;color:var(--accent-ink);font-weight:550;cursor:pointer;text-decoration:none}
.ghost:hover{background:var(--hover)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 16px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-weight:600;cursor:pointer;white-space:nowrap}
.btn:hover{filter:brightness(1.07)}
.btn:disabled{opacity:.55;cursor:default;filter:none}
.btn.danger,.ghost.danger{color:var(--bad)}
.btn.danger{background:var(--bad);color:#fff}
.end{margin-inline-start:auto}
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 14px}
.chips:not(:empty){padding-block:8px;border-bottom:1px solid var(--line)}
.chips .ghost{height:28px;padding:0 8px}
.chip{display:inline-flex;align-items:center;gap:6px;padding-block:3px;padding-inline:12px 4px;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);font-size:13px}
.chip button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:var(--ink2);cursor:pointer}
.chip button:hover{background:var(--hover)}
.banner{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bad) 10%,transparent);font-size:13.5px}
.banner .ghost{margin-inline-start:auto}
.table-wrap{position:relative;overflow:auto}
table{width:100%;border-collapse:separate;border-spacing:0;transition:opacity .15s}
th{position:sticky;top:0;z-index:2;padding:0;border-bottom:1px solid var(--line);background:var(--surface);text-align:start;font-size:12.5px;font-weight:600;color:var(--ink2);white-space:nowrap}
th>button,th>span{display:flex;align-items:center;gap:6px;width:100%;padding:10px var(--pad-x);border:0;background:transparent;font-weight:inherit;text-align:start}
th>button{cursor:pointer}
th>button:hover{background:var(--hover);color:var(--ink)}
th[aria-sort=ascending],th[aria-sort=descending]{color:var(--ink)}
.sort-i{display:inline-flex;color:var(--muted)}
.sort-i .i{width:14px;height:14px}
th[aria-sort=ascending] .sort-i,th[aria-sort=descending] .sort-i{color:var(--accent)}
td{padding:var(--pad-y) var(--pad-x);border-bottom:1px solid var(--line);vertical-align:top;font-size:var(--row-font)}
tbody tr.click{cursor:pointer}
tbody tr.click:hover>td{background:var(--hover)}
tbody tr:focus-visible{outline-offset:-2px}
.phone{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;white-space:nowrap}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:550;color:var(--ink2);white-space:nowrap}
.badge .i{width:15px;height:15px}
.badge.good .i{color:var(--good)}.badge.warn .i{color:var(--warn)}.badge.bad .i{color:var(--bad)}.badge.neutral .i{color:var(--neutral)}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;background:var(--hover);border:1px solid var(--ring);font-size:12px;font-weight:550;color:var(--ink2);white-space:nowrap}
.tag.accent{background:color-mix(in srgb,var(--accent) 13%,transparent);border-color:transparent;color:var(--ink)}
.tag.off{color:var(--bad)}
.dash,.muted{color:var(--muted)}
.skeleton{padding:4px 14px}
.skeleton div{height:46px;margin:8px 0;border-radius:8px;background:linear-gradient(90deg,var(--hover),color-mix(in srgb,var(--ink) 7%,transparent),var(--hover));background-size:200% 100%;animation:shimmer 1.2s linear infinite}
@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.empty{display:grid;justify-items:center;gap:6px;padding:56px 16px;text-align:center;color:var(--ink2)}
.empty p{margin:0}
.empty>.i{width:36px;height:36px;margin-bottom:6px;color:var(--muted)}
.empty-title{font-weight:600;color:var(--ink)}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;padding:9px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.toast{position:fixed;bottom:20px;left:50%;z-index:20;transform:translateX(-50%);padding:8px 16px;border-radius:9px;background:var(--ink);color:var(--page);font-size:13.5px;box-shadow:0 4px 18px rgba(0,0,0,.18)}
dialog{width:min(580px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:0;border:1px solid var(--ring);border-radius:14px;background:var(--surface);color:var(--ink);box-shadow:0 24px 64px rgba(0,0,0,.28)}
dialog::backdrop{background:rgba(0,0,0,.38)}
.dialog-body{display:flex;flex-direction:column;gap:14px;max-height:calc(100dvh - 26px);overflow:auto;padding:18px 20px}
.dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dialog-head h2{margin:0;font-size:17px;font-weight:650}
.icon-btn{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--ink2);cursor:pointer}
.icon-btn:hover{background:var(--hover)}
.dialog-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--line)}
.dialog-foot .hint:first-child{margin-inline-end:auto}
.fld{display:grid;gap:6px;min-width:0}
.fld>span:first-child,.label{font-size:13px;font-weight:600;color:var(--ink2)}
.fld input,.fld select{width:100%}
.hint{font-size:12.5px;color:var(--muted)}
.hint.bad{color:var(--bad)}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.check{display:flex;align-items:center;gap:8px;cursor:pointer}
input[type=checkbox]{width:16px;height:16px;margin:0;accent-color:var(--accent)}
@media (min-width:761px) and (min-height:560px){body.app{display:flex;flex-direction:column;height:100dvh}body.app main.wrap{flex:1;min-height:0}body.app .panel.fill{flex:1;min-height:0}body.app .fill .table-wrap{flex:1;min-height:0}}
@media (max-width:760px){
.wrap{padding:0 12px}.who,.sub{display:none}.top .wrap{flex-wrap:wrap;gap:8px 12px}.nav{order:3;width:100%}
.search{flex-basis:100%;max-width:none}.seg{flex:1 1 100%}.seg button{flex:1}.toolbar select{flex:1 1 calc(50% - 4px);min-width:0}.custom{flex:1 1 100%}.custom input{flex:1;min-width:0}
.grid2{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
export function header(current: 'messages'|'admin', live: boolean): string {
 const link = (href: string, label: string, id: string, on: boolean, hidden: boolean) => '<a href="'+href+'" id="'+id+'"'+(on?' aria-current="page"':'')+(hidden?' hidden':'')+'>'+label+'</a>';
 const density = (['wide','narrow','dense'] as const).map(d => '<button type="button" data-density="'+d+'" title="'+{wide:'רחב',narrow:'צר',dense:'צפוף'}[d]+'" aria-label="'+{wide:'רחב',narrow:'צר',dense:'צפוף'}[d]+'" aria-pressed="false">'+svg(d)+'</button>').join('');
 return '<header class="top"><div class="wrap"><div class="brand"><span class="logo">'+svg('chat')+'</span><div><h1>הודעות SMS</h1><p class="sub" id="org">מצב הגשה אינו אישור מסירה</p></div></div>'
  +'<nav class="nav" aria-label="ניווט">'+link('/','הודעות','nav-messages',current==='messages',false)+link('/admin','ניהול','nav-admin',current==='admin',current!=='admin')+'</nav>'
  +'<div class="top-end"><div class="density" role="group" aria-label="מרווח שורות">'+density+'</div>'
  +(live?'<span class="live" id="live" role="status"><span class="dot"></span><span id="live-text">מתחבר…</span></span>':'')
  +'<span class="who" id="who"></span></div></div></header>';
}
export const baseScript = 'const ICONS='+JSON.stringify(ICONS)+';' + String.raw`
'use strict';
const $=id=>document.getElementById(id);
const TZ='Asia/Jerusalem';
let ME=null,toastTimer=0;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=text;return e;}
function icon(name){const t=document.createElement('template');t.innerHTML='<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>';return t.content.firstChild;}
const nf=new Intl.NumberFormat('he-IL');
const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
const clockFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});
const dayFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric'});
const yearFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,day:'numeric',month:'numeric',year:'2-digit'});
const fullFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,dateStyle:'full',timeStyle:'medium'});
const shortFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,dateStyle:'short',timeStyle:'short'});
const secFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit'});
function zoned(ms){const p={};for(const x of parts.formatToParts(ms))p[x.type]=Number(x.value);return p;}
function pad(n){return String(n).padStart(2,'0');}
function ymd(ms){const p=zoned(ms);return p.year+'-'+pad(p.month)+'-'+pad(p.day);}
function today(){return ymd(Date.now());}
function shift(day,days){const a=day.split('-').map(Number);return new Date(Date.UTC(a[0],a[1]-1,a[2]+days)).toISOString().slice(0,10);}
function offset(ms){const p=zoned(ms);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-(ms-ms%1000);}
// Midnight of a calendar day in Israel time, whatever the browser's own timezone is.
function midnight(day){const a=day.split('-').map(Number);const guess=Date.UTC(a[0],a[1]-1,a[2]);return guess-offset(guess-offset(guess));}
function local(n){if(!/^[+]972[0-9]{8,9}$/.test(n))return n;const l='0'+n.slice(4);return l.length===10?l.slice(0,3)+'-'+l.slice(3,6)+'-'+l.slice(6):l.slice(0,2)+'-'+l.slice(2,5)+'-'+l.slice(5);}
// Mirrors recipient() on the server: typed or imported numbers, including 972… without a plus and a lost leading zero.
function normalize(v){let n=String(v).replace(/[\s().\-‎‏‪-‮]/g,'');if(/^972[0-9]{8,9}$/.test(n))n='+'+n;else if(/^[2-9][0-9]{7,8}$/.test(n))n='0'+n;if(/^00/.test(n))n='+'+n.slice(2);if(/^0[0-9]{8,9}$/.test(n))n='+972'+n.slice(1);return /^[+][1-9][0-9]{7,14}$/.test(n)?n:null;}
// An expired Access session answers with a redirect to the login page instead of JSON.
async function request(path,init){let r;try{r=await fetch(path,Object.assign({cache:'no-store',credentials:'same-origin',redirect:'manual'},init));}catch(e){throw new Error('offline');}
 if(r.type==='opaqueredirect'||r.status===401)throw new Error('auth');let d;try{d=await r.json();}catch(e){throw new Error(r.ok?'auth':'HTTP '+r.status);}
 if(!r.ok){const err=new Error(d&&d.error?d.error:'HTTP '+r.status);err.status=r.status;throw err;}return d;}
function get(path){return request(path,{headers:{Accept:'application/json'}});}
function post(path,body){return request(path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});}
function message(e){const m=e&&e.message||'';return m==='auth'?'פג תוקף ההתחברות. יש לרענן את הדף כדי להתחבר מחדש.':m==='offline'?'אין חיבור לשרת.':m;}
function toast(text){const t=$('toast');t.textContent=text;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},2400);}
function density(v,save){if(!['wide','narrow','dense'].includes(v))v='narrow';document.documentElement.dataset.density=v;for(const b of document.querySelectorAll('button[data-density]'))b.setAttribute('aria-pressed',String(b.dataset.density===v));try{localStorage.setItem('density',v);}catch(e){}if(save)post('/api/me/prefs',{density:v}).catch(function(){});}
for(const b of document.querySelectorAll('button[data-density]'))b.addEventListener('click',function(){density(b.dataset.density,true);});
(function(){let v=null;try{v=localStorage.getItem('density');}catch(e){}density(v,false);})();
async function loadMe(){ME=await get('/api/me');$('who').textContent=ME.name||ME.email;$('who').title=ME.email;$('nav-admin').hidden=ME.role!=='admin';if(ME.settings.org_name)$('org').textContent=ME.settings.org_name;density(ME.density,false);return ME;}
`;
export function shell(nonce: string, title: string, css: string, body: string, script: string, bodyClass = ''): string {
 return '<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>'+title+'</title><style nonce="'+nonce+'">'+baseCss+css+'</style></head><body'+(bodyClass?' class="'+bodyClass+'"':'')+'>'+body+'<div class="toast" id="toast" role="status" hidden></div><script nonce="'+nonce+'">'+baseScript+script+'</script></body></html>';
}
export function noAccessPage(nonce: string, email: string): string {
 return shell(nonce,'אין גישה','.card{max-width:460px;margin:12vh auto;padding:28px;text-align:center}.card>.i{width:40px;height:40px;color:var(--accent)}.card h2{margin:12px 0 6px;font-size:19px}.card p{margin:0 0 18px;color:var(--ink2)}',
  '<main class="wrap"><section class="panel card">'+svg('chat')+'<h2>אין לך גישה למערכת</h2><p>החשבון <bdi>'+escape(email)+'</bdi> אינו מורשה להשתמש בלוח ההודעות. כדי לקבל גישה יש לפנות למנהל המערכת.</p><a class="btn" href="/cdn-cgi/access/logout">התנתקות</a></section></main>','');
}

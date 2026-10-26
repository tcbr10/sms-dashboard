import {header,shell,svg} from './ui';
import {LINKS_JS} from '../../../shared/links';
export {adminPage} from './admin-page';
export {noAccessPage,sessionEndedPage} from './ui';
const css = String.raw`
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0}
.stat{padding:12px 16px;border:1px solid var(--ring);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
.stat dt{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink2)}
.stat dd{margin:2px 0 0;font-size:26px;font-weight:650;letter-spacing:-.02em}
.key{width:8px;height:8px;border-radius:2px;background:var(--in)}
.key.out{background:var(--out)}
.msgs{table-layout:fixed}
.busy.has-rows .msgs{opacity:.55}
.th-btn{display:flex;align-items:center;gap:6px;width:100%;padding:10px var(--pad-x);border:0;background:transparent;font-weight:inherit;color:inherit;text-align:start;cursor:pointer}
.th-btn:hover{background:var(--hover);color:var(--ink)}
.th-label{overflow:hidden;text-overflow:ellipsis}
.fi{display:inline-flex;color:var(--accent)}
.fi .i{width:13px;height:13px}
.msgs tbody tr{cursor:pointer}
.msgs tbody tr:hover>td{background:var(--hover)}
.msgs tbody tr>td:first-child{border-inline-start:3px solid transparent}
.msgs tr.in>td:first-child{border-inline-start-color:var(--in)}
.msgs tr.out>td:first-child{border-inline-start-color:var(--out)}
.msgs tr.open>td{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.msgs tr.fresh>td{animation:flash 2.6s ease-out}
@keyframes flash{from{background:color-mix(in srgb,var(--accent) 20%,transparent)}to{background:transparent}}
.msgs td{overflow-wrap:anywhere}
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
.tag.test{margin-inline-start:6px}
.details{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:12.5px;color:var(--ink2);cursor:auto}
.details b{margin-inline-end:6px;font-weight:600;color:var(--muted)}
.actions{display:flex;flex-wrap:wrap;gap:6px;margin-inline-start:auto}
.act{display:inline-flex;flex:none;align-items:center;gap:6px;height:30px;white-space:nowrap;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--field);font-size:12.5px;cursor:pointer}
.act:hover{border-color:var(--accent)}
[data-density=dense] .day,[data-density=dense] .clock{display:inline}[data-density=dense] .clock{margin-inline-start:6px}[data-density=dense] .num-sub{display:none}[data-density=dense] .dir{padding-block:0}
.more-row{display:flex;justify-content:center;padding:14px}
.more{height:36px;padding:0 16px;border:1px solid var(--line);border-radius:9px;background:var(--field);cursor:pointer}
#filters-btn{display:none}
#c-file-btn,#le-file-btn{cursor:pointer}
#c-invalid-more{height:24px;margin-inline-start:6px;padding:0 6px}
#c-vars{height:28px;padding:0 8px;font-size:12.5px}
#c-later-date,#c-later-time{width:auto}
.sch-body{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sch-edit{display:flex;gap:4px;align-items:center}.sch-edit input{min-height:30px;padding:0 6px;border:1px solid var(--line);border-radius:7px;background:var(--field)}
#c-vars-hint{white-space:pre-wrap;overflow-wrap:anywhere}
#c-to:placeholder-shown,#le-add:placeholder-shown{direction:rtl}
.dialog-body .banner{border:0;border-radius:9px}
.check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 12px}
.list-rows{display:grid;gap:6px;max-height:50vh;overflow:auto}
.list-row{display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--field);text-align:start;cursor:pointer}
.list-row:hover{border-color:var(--accent)}
.list-name{font-weight:600}
.members{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px;max-height:240px;overflow:auto}
.member{display:flex;align-items:center;justify-content:space-between;gap:4px;padding-inline:8px 2px;border:1px solid var(--line);border-radius:8px}
.member .icon-btn{width:26px;height:26px}
.fd-section{display:grid;gap:8px;padding-block:10px;border-top:1px solid var(--line)}
@media (max-width:760px){
.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stat{padding:10px 12px}.stat dd{font-size:22px}
#filters-btn{display:inline-flex}#new{flex:1 1 100%}
.table-wrap{overflow:visible}.msgs{min-width:0!important}.msgs colgroup,.msgs thead{display:none}.msgs,.msgs tbody{display:block}
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
.msgs td.c-extra{grid-column:1/-1;font-size:13px}
.msgs td.c-extra::before{content:attr(data-label) ": ";font-weight:600;color:var(--muted)}
.day,.clock,.num-label,.num-sub{display:inline}.clock{margin-inline-start:6px}
.actions{margin-inline-start:0}.check-grid{grid-template-columns:1fr}
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
   <label class="field search">`+svg('search')+String.raw`<input id="q" type="search" maxlength="200" placeholder="חיפוש בטקסט, במספר או באיש קשר" aria-label="חיפוש"></label>
   <button type="button" class="ghost" id="filters-btn">`+svg('filter')+String.raw`סינון ומיון</button>
   <button type="button" class="ghost" id="columns-btn" aria-haspopup="dialog">`+svg('columns')+String.raw`עמודות</button>
   <button type="button" class="ghost" id="export-btn">`+svg('download')+String.raw`ייצוא</button>
   <button type="button" class="ghost" id="sched-btn" hidden>`+svg('clock')+String.raw`מתוזמנות</button><button type="button" class="ghost" id="lists-btn" hidden>`+svg('list')+String.raw`רשימות</button>
   <button type="button" class="btn end" id="new" hidden>`+svg('send')+String.raw`הודעה חדשה</button>
  </form>
  <div class="chips" id="chips"></div>
  <div class="banner" id="error" role="alert" hidden><span id="error-text"></span><button type="button" class="ghost" id="reload" hidden>רענון הדף</button></div>
  <div class="table-wrap" id="scroll">
   <table class="msgs" id="table"><colgroup id="cols"></colgroup><thead><tr id="head"></tr></thead><tbody id="rows"></tbody></table>
   <div class="skeleton" id="skeleton" aria-hidden="true"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
   <div class="empty" id="empty" hidden>`+svg('chat')+String.raw`<p class="empty-title" id="empty-title"></p><p id="empty-sub"></p><button type="button" class="ghost" id="empty-clear" hidden>ניקוי כל הסינונים</button></div>
   <div class="more-row" id="more-row" hidden><button type="button" class="more" id="more">טעינת הודעות נוספות</button></div>
  </div>
  <div class="foot"><span id="count"></span><span>הזמנים לפי שעון ישראל · הודעות יוצאות מוצגות רק ממערכות שמדווחות עליהן<span id="updated"></span><span id="restricted-note" hidden> · חלק מההודעות מוצגות לפי הגבלות הצפייה שלך</span></span></div>
 </section>
</main>
<dialog id="compose" aria-labelledby="c-title"><form class="dialog-body" id="c-form" novalidate>
 <div class="dialog-head"><h2 id="c-title">הודעה חדשה</h2><button type="button" class="icon-btn" id="c-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <label class="fld"><span>שליחה מהמספר</span><select id="c-from"></select></label>
 <div class="fld" id="c-sender-row" hidden><label class="fld"><span>השולח שהנמען יראה</span><select id="c-sender"></select></label><p class="hint" id="c-sender-note" hidden></p></div>
 <div class="fld" id="c-flow-row" hidden><label class="fld"><span>תהליך בוט</span><select id="c-flow"></select></label><p class="hint" id="c-flow-hint" hidden>ההודעה היא השלב הראשון של התהליך, ותשובות הנמענים ימשיכו אותו אוטומטית.</p><label class="check hint" id="c-stop-row"><input type="checkbox" id="c-stop-bot">השבתת הבוט לנמענים האלה (הבוט לא יענה להם עד שיופעל מחדש)</label></div>
 <div class="fld"><label class="label" for="c-to">נמענים</label>
  <textarea id="c-to" dir="ltr" rows="3" placeholder="מספרי טלפון מופרדים בפסיק או בשורה חדשה"></textarea>
  <div class="row"><span class="hint" id="c-summary"></span><span class="end"></span><button type="button" class="ghost" id="c-save-list" hidden>`+svg('list')+String.raw`שמירה כרשימה</button><label class="ghost" id="c-file-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="c-file" accept=".csv,.txt,.xlsx" hidden></label></div>
  <div class="row" id="c-import" hidden><span class="hint" id="c-import-info"></span><label class="row hint">עמודת הטלפון<select id="c-column"></select></label><button type="button" class="ghost danger" id="c-import-clear">הסרת הקובץ</button></div>
  <p class="hint bad" id="c-invalid" hidden><span id="c-invalid-text"></span><button type="button" class="ghost" id="c-invalid-more">פירוט</button></p>
 </div>
 <div class="fld" id="c-lists-row" hidden><span class="label">רשימות תפוצה</span><div class="check-grid" id="c-lists"></div></div>
 <div class="fld"><div class="row"><label class="label" for="c-body">הודעה</label><button type="button" class="ghost end" id="c-vars" aria-haspopup="dialog">{ } הוספת משתנה</button></div><textarea id="c-body" rows="5" maxlength="1000"></textarea>
  <p class="hint" id="c-vars-hint" hidden></p>
  <div class="row"><span class="hint" id="c-count"></span><span class="hint end" id="c-usage"></span></div><p class="hint" id="c-optout" hidden></p></div>
 <div class="fld" id="c-track-row" hidden><label class="check"><input type="checkbox" id="c-track">`+svg('link')+String.raw`קיצור ומעקב קישורים</label><p class="hint" id="c-track-hint"></p></div>
 <div class="fld"><span class="label">הודעת בדיקה</span><div class="row"><input id="c-test" class="field phone" dir="ltr" maxlength="20" placeholder="מספר לבדיקה" aria-label="מספר לבדיקה"><button type="button" class="ghost" id="c-test-send">`+svg('flask')+String.raw`שליחת בדיקה</button><label class="check hint"><input type="checkbox" id="c-test-save">שמירה כמספר הבדיקה שלי</label></div></div>
 <div class="fld"><label class="check"><input type="checkbox" id="c-later">שליחה מתוזמנת</label><div class="row" id="c-later-row" hidden><input type="date" id="c-later-date" class="field" aria-label="תאריך שליחה"><input type="time" id="c-later-time" class="field" aria-label="שעת שליחה"><span class="hint">לפי שעון ישראל. אפשר לשנות או לבטל עד מועד השליחה.</span></div></div>
 <div class="banner" id="c-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="hint" id="c-total"></span><button type="button" class="ghost" id="c-cancel">ביטול</button><button type="submit" class="btn" id="c-send">`+svg('send')+String.raw`<span id="c-send-text">המשך</span></button></div>
</form></dialog>
<dialog id="export-dlg" aria-labelledby="ex-title"><form class="dialog-body" id="ex-form" novalidate>
 <div class="dialog-head"><h2 id="ex-title">ייצוא הודעות</h2><button type="button" class="icon-btn" id="ex-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="fld"><span class="label">פורמט</span><div class="seg" role="group" aria-label="פורמט"><button type="button" data-format="xlsx" aria-pressed="true">Excel</button><button type="button" data-format="csv" aria-pressed="false">CSV</button></div></div>
 <div class="fld"><span class="label">שורות</span><div class="seg" role="group" aria-label="שורות"><button type="button" data-rows="messages" aria-pressed="true">כל ההודעות</button><button type="button" data-rows="peers" aria-pressed="false">שורה אחת לכל מספר</button></div></div>
 <div class="fld"><div class="row"><span class="label">עמודות</span><button type="button" class="ghost end" id="ex-all-fields">`+svg('columns')+String.raw`כל שדות אנשי הקשר</button></div><div class="check-grid" id="ex-cols"></div></div>
 <p class="hint" id="ex-count"></p>
 <div class="bar" id="ex-bar" hidden><div id="ex-progress"></div></div>
 <div class="banner" id="ex-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="hint" id="ex-status"></span><button type="button" class="ghost" id="ex-cancel">ביטול</button><button type="submit" class="btn" id="ex-go">`+svg('download')+String.raw`ייצוא</button></div>
</form></dialog>
<dialog id="lists-dlg" aria-labelledby="ld-title"><div class="dialog-body">
 <div class="dialog-head"><h2 id="ld-title">רשימות תפוצה</h2><button type="button" class="icon-btn" id="ld-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div id="ld-index" class="fld"><div class="row"><span class="hint">רשימות פרטיות גלויות רק לך. רשימות משותפות נוצרות על ידי מנהלים.</span><button type="button" class="btn end" id="ld-new">`+svg('plus')+String.raw`רשימה חדשה</button></div><div class="list-rows" id="ld-rows"></div></div>
 <form id="ld-edit" class="fld" hidden novalidate>
  <label class="fld"><span>שם הרשימה</span><input id="le-name" maxlength="60" required></label>
  <label class="check" id="le-shared-row"><input type="checkbox" id="le-shared">רשימה משותפת לכל המשתמשים</label>
  <div class="fld"><label class="label" for="le-add">הוספת מספרים</label><textarea id="le-add" dir="ltr" rows="2" placeholder="מספרים מופרדים בפסיק או בשורה חדשה"></textarea>
   <div class="row"><button type="button" class="ghost" id="le-add-btn">`+svg('plus')+String.raw`הוספה</button><label class="ghost" id="le-file-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="le-file" accept=".csv,.txt,.xlsx" hidden></label><span class="hint end" id="le-count"></span></div>
   <div class="row" id="le-import" hidden><span class="hint" id="le-import-info"></span><label class="row hint">עמודה<select id="le-column"></select></label><label class="check hint"><input type="checkbox" id="le-header">השורה הראשונה היא כותרות</label><button type="button" class="ghost" id="le-import-add">`+svg('plus')+String.raw`הוספת המספרים</button><button type="button" class="ghost danger" id="le-import-clear">ביטול</button></div></div>
  <div class="fld"><input type="search" id="le-q" class="field" placeholder="חיפוש ברשימה" aria-label="חיפוש ברשימה"><div class="members" id="le-members"></div></div>
  <div class="banner" id="le-error" role="alert" hidden></div>
  <div class="dialog-foot"><button type="button" class="ghost danger" id="le-delete">מחיקת הרשימה</button><span class="end"></span><button type="button" class="ghost" id="le-back">חזרה לרשימות</button><button type="submit" class="btn" id="le-save">שמירה</button></div>
 </form>
</div></dialog>
<dialog id="ce-dlg" aria-labelledby="ce-title"><form class="dialog-body" id="ce-form" novalidate>
 <div class="dialog-head"><h2 id="ce-title">פרטי לקוח</h2><button type="button" class="icon-btn" id="ce-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <p class="hint"><span class="phone" id="ce-number"></span> · הפרטים משותפים לכל המשתמשים</p>
 <div class="grid2" id="ce-fields"></div>
 <div class="banner" id="ce-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="end"></span><button type="button" class="ghost" id="ce-cancel">ביטול</button><button type="submit" class="btn" id="ce-save">שמירה</button></div>
</form></dialog>
<dialog id="sch-dlg" aria-labelledby="sch-title"><div class="dialog-body">
 <div class="dialog-head"><h2 id="sch-title">שליחות מתוזמנות</h2><button type="button" class="icon-btn" id="sch-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="table-wrap rp-wrap"><table><thead><tr><th><span>מועד</span></th><th><span>מספר</span></th><th><span>נמענים</span></th><th><span>הודעה</span></th><th><span>מצב</span></th><th><span></span></th></tr></thead><tbody id="sch-rows"></tbody></table></div>
 <div class="dialog-foot"><span class="hint" id="sch-note"></span><span class="end"></span><button type="button" class="btn" id="sch-done">סגירה</button></div>
</div></dialog>
<dialog id="filter-dlg" aria-labelledby="fd-title"><div class="dialog-body">
 <div class="dialog-head"><h2 id="fd-title">סינון ומיון</h2><button type="button" class="icon-btn" id="fd-close" aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <label class="fld"><span>מיון</span><select id="fd-sort"></select></label>
 <div id="fd-body"></div>
 <div class="dialog-foot"><button type="button" class="ghost" id="fd-clear">ניקוי כל הסינונים</button><span class="end"></span><button type="button" class="btn" id="fd-done">הצגת התוצאות</button></div>
</div></dialog>
`;
const script = String.raw`
// Tracked links (shared/links.ts): clicked by a person, opened only automatically (link previews, scanners), or not opened.
const CLICKS={clicked:'נלחץ',auto:'נפתח אוטומטית בלבד',none:'לא נפתח'};
function clickState(m){return m.clicks==null?null:m.clicks>0?'clicked':m.auto_clicks>0?'auto':'none';}
const STATUS={pending:['בתהליך','warn','clock','ההגשה בתהליך'],accepted:['התקבלה','good','check','ההגשה התקבלה אצל הספק. זה אינו אישור מסירה'],rejected:['נדחתה','bad','x','ההגשה נדחתה'],unknown:['לא ידוע','neutral','question','תוצאת ההגשה לא ידועה']};
const DIR={in:'נכנסת',out:'יוצאת'};
const RANGES=[['','הכל'],['1h','שעה אחרונה'],['24h','24 שעות'],['today','היום'],['7','7 ימים'],['30','30 ימים'],['custom','טווח']];
const DATE=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,TIME=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const state={q:'',peer:'',sort:'time',order:'desc'};
// Column filters: a date range with optional times or a number of recent hours, value sets (direction, status, system number) and "contains" text keyed by query parameter.
const F={range:'',hours:0,from:'',to:'',fromTime:'',toTime:'',dir:[],status:[],num:[],clicks:[],text:{}};
let COLS=[],visible=[];
const rows=new Map(),cache=new Map(),fresh=new Set(),expanded=new Set(),labels=new Map();
let next=null,sync=null,boundary=null,maxId=null,total=null,S=null,statsAt=0,statsStale=false,gen=0,loading=false,polling=false,paging=false,stopped=false,fails=0,unseen=0,timer=0,debounce=0,saveTimer=0,noNumbers=false;

function buildColumns(){COLS=[{id:'time',label:'זמן',sort:'time',filter:'date',cls:'c-time',w:112},
  {id:'direction',label:'כיוון',sort:'direction',filter:'set',key:'dir',options:[['in','נכנסות'],['out','יוצאות']],cls:'c-dir',w:100},
  {id:'peer',label:'לקוח',sort:'peer',filter:'text',param:'peer_q',cls:'c-peer',w:144}];
 for(const f of ME.contact_fields)COLS.push({id:'c:'+f.id,field:f.id,label:f.label,sort:'c:'+f.id,filter:'text',param:'cf_'+f.id,cls:'c-extra',w:150});
 COLS.push({id:'number',label:'מספר מערכת',sort:'number',filter:'set',key:'num',options:ME.numbers.map(function(n){return [n.number,n.label];}),cls:'c-num',w:160},
  {id:'body',label:'הודעה',filter:'text',param:'body_q',cls:'c-msg',w:0},
  {id:'status',label:'סטטוס הגשה',sort:'status',filter:'set',key:'status',options:Object.keys(STATUS).map(function(k){return [k,STATUS[k][0]];}),cls:'c-status',w:124},
  {id:'clicks',label:'לחיצות',sort:'clicks',filter:'set',key:'clicks',options:Object.keys(CLICKS).map(function(k){return [k,CLICKS[k]];}),cls:'c-extra',w:130},
  {id:'sent_by',label:'נשלחה על ידי',sort:'sent_by',filter:'text',param:'by_q',cls:'c-extra',w:190},
  {id:'received',label:'נקלטה',sort:'received',cls:'c-extra',w:150});
 const saved=Array.isArray(ME.columns)?ME.columns.filter(function(id){return COLS.some(function(c){return c.id===id;});}):[];visible=order(saved.length?saved:defaultColumns());}
function defaultColumns(){return ['time','direction','peer'].concat(ME.contact_fields.length?['c:'+ME.contact_fields[0].id]:[]).concat(['number','body','status']);}
function order(ids){return COLS.map(function(c){return c.id;}).filter(function(id){return ids.includes(id);});}
function col(id){return COLS.find(function(c){return c.id===id;});}
function when(ms,now){const d=ymd(ms);const day=d===now?'היום':d===shift(now,-1)?'אתמול':(d.slice(0,4)===now.slice(0,4)?dayFmt:yearFmt).format(ms);return [day,clockFmt.format(ms)];}
function pick(v,allowed){return (v||'').split(',').filter(function(x){return allowed.includes(x);});}
function textParams(){return COLS.filter(function(c){return c.filter==='text';}).map(function(c){return c.param;});}
function readUrl(){const p=new URLSearchParams(location.search);state.q=(p.get('q')||'').slice(0,200);state.peer=normalize(p.get('peer')||'')||'';
 const s=p.get('sort');state.sort=COLS.some(function(c){return c.sort&&c.sort===s;})?s:'time';const o=p.get('order');state.order=o==='asc'||o==='desc'?o:'desc';
 F.range=RANGES.some(function(r){return r[0]&&r[0]===p.get('range');})?p.get('range'):'';const h=Number(p.get('hours'));if(p.get('range')==='hours'&&validHours(h)){F.range='hours';F.hours=h;}F.from=DATE.test(p.get('from')||'')?p.get('from'):'';F.to=DATE.test(p.get('to')||'')?p.get('to'):'';
 F.fromTime=TIME.test(p.get('from_t')||'')?p.get('from_t'):'';F.toTime=TIME.test(p.get('to_t')||'')?p.get('to_t'):'';
 F.dir=pick(p.get('dir'),['in','out']);F.status=pick(p.get('status'),Object.keys(STATUS));F.num=pick(p.get('num'),ME.numbers.map(function(n){return n.number;}));F.clicks=pick(p.get('clicks'),Object.keys(CLICKS));
 F.text={};for(const k of textParams()){const v=p.get(k);if(v)F.text[k]=v.slice(0,200);}}
function writeUrl(){const p=new URLSearchParams();if(state.q)p.set('q',state.q);if(state.peer)p.set('peer',state.peer);if(state.sort!=='time'||state.order!=='desc'){p.set('sort',state.sort);p.set('order',state.order);}
 if(F.range){p.set('range',F.range);if(F.range==='hours')p.set('hours',String(F.hours));if(F.range==='custom'){if(F.from)p.set('from',F.from);if(F.fromTime)p.set('from_t',F.fromTime);if(F.to)p.set('to',F.to);if(F.toTime)p.set('to_t',F.toTime);}}
 if(F.dir.length)p.set('dir',F.dir.join(','));if(F.status.length)p.set('status',F.status.join(','));if(F.num.length)p.set('num',F.num.join(','));if(F.clicks.length)p.set('clicks',F.clicks.join(','));for(const k in F.text)p.set(k,F.text[k]);
 const s=p.toString();history.replaceState(null,'',s?'?'+s:location.pathname);}
function active(c){if(!c.filter)return false;if(c.filter==='date')return !!F.range;if(c.filter==='set')return F[c.key].length>0;return !!F.text[c.param];}
// Recent hours typed by the user: a whole number up to 30 days.
function validHours(h){return Number.isInteger(h)&&h>=1&&h<=720;}
function clearRange(){F.range='';F.hours=0;F.from='';F.to='';F.fromTime='';F.toTime='';}
function clearColumn(c){if(c.filter==='date')clearRange();else if(c.filter==='set')F[c.key]=[];else delete F.text[c.param];}
function filtered(){return !!(state.q||state.peer)||COLS.some(active);}
// A time without a date means today. The end time includes its whole minute; an end date without a time includes the whole day.
function bounds(){const t=today();if(F.range==='1h'||F.range==='24h'||F.range==='hours')return [Date.now()-(F.range==='1h'?1:F.range==='24h'?24:F.hours)*3600000];if(F.range==='today')return [midnight(t)];if(F.range==='7'||F.range==='30')return [midnight(shift(t,1-Number(F.range)))];
 if(F.range==='custom'){const from=F.from||(F.fromTime?t:''),to=F.to||(F.toTime?t:'');return [from?israelTime(from,F.fromTime):undefined,to?(F.toTime?israelTime(to,F.toTime)+60000:midnight(shift(to,1))):undefined];}return [];}
function query(withStatus){const p=new URLSearchParams();if(F.num.length)p.set('system_number',F.num.join(','));if(state.peer)p.set('peer_number',state.peer);if(state.q)p.set('q',state.q);
 if(F.dir.length)p.set('direction',F.dir.join(','));if(F.status.length&&withStatus)p.set('status',F.status.join(','));if(F.clicks.length&&withStatus)p.set('clicks',F.clicks.join(','));for(const k in F.text)p.set(k,F.text[k]);
 const b=bounds();if(b[0]!==undefined)p.set('from',String(b[0]));if(b[1]!==undefined)p.set('to',String(b[1]));p.set('sort',state.sort);p.set('order',state.order);p.set('limit','100');return p;}

function live(kind,text){$('live').className='live '+kind;$('live-text').textContent=text;}
function ok(){fails=0;live('ok','עדכון חי');$('updated').textContent=' · עודכן '+secFmt.format(Date.now());if(!$('error').dataset.sticky)$('error').hidden=true;}
function showError(text,reload){$('error').hidden=false;$('error-text').textContent=text;$('reload').hidden=!reload;$('error').dataset.sticky=reload?'1':'';}
function fail(e,initial){fails++;const m=e&&e.message||'';
 if(m==='auth'||m==='This account has no access'||m==='Session ended'){stopped=true;live('err','נדרשת התחברות');showError(m==='This account has no access'?'הגישה שלך למערכת הוסרה.':m==='Session ended'?'מנהל המערכת ניתק את החיבור שלך. יש לרענן את הדף ולהתחבר מחדש.':message(e),true);return;}
 if(m==='offline'){live('err','אין חיבור');if(initial||fails>=3)showError('אין חיבור לשרת. מנסים שוב אוטומטית…');return;}
 live('err','שגיאה');showError('טעינת הנתונים נכשלה: '+m);}
function busy(on){$('panel').classList.toggle('busy',on);}
function title(){document.title=(unseen?'('+unseen+') ':'')+'הודעות SMS';}

// Counting scans every matching message, so the full count runs when the filters change and then at most every
// 10 minutes. In between, new messages from live updates are added to the counts here; the customer count waits for the full count.
async function stats(g){try{const s=await get('/api/stats?'+query(true));if(g!==gen)return;S=s;maxId=s.max_id;statsAt=Date.now();statsStale=false;showStats();}
 catch(e){if(g===gen)for(const id of ['s-total','s-in','s-out','s-peers'])$(id).textContent='—';}}
function showStats(){total=S.total;$('s-total').textContent=nf.format(S.total);$('s-in').textContent=nf.format(S.incoming);$('s-out').textContent=nf.format(S.outgoing);$('s-peers').textContent=nf.format(S.peers);count();}
function bump(m){maxId=Math.max(maxId,m.id);statsStale=true;if(S&&(!F.status.length||F.status.includes(m.submission_status))&&(!F.clicks.length||F.clicks.includes(clickState(m)))){S.total++;S[m.direction==='in'?'incoming':'outgoing']++;}}
async function load(){const g=++gen;loading=true;total=null;maxId=null;busy(true);writeUrl();renderHead();renderChips();render();
 try{const d=(await Promise.all([get('/api/messages?'+query(true)),stats(g)]))[0];if(g!==gen)return;
  rows.clear();cache.clear();$('rows').replaceChildren();fresh.clear();expanded.clear();for(const m of d.messages)rows.set(m.id,m);
  next=d.next_cursor;sync=d.sync_cursor;boundary=d.has_more?d.messages[d.messages.length-1]:null;$('scroll').scrollTop=0;ok();}
 catch(e){if(g===gen){rows.clear();next=null;sync=null;fail(e,true);}}
 finally{if(g===gen){loading=false;busy(false);render();}}}
// Live updates fetch rows changed since the last sync. Rows past the last loaded page are left for "load more",
// and the status and clicks filters are applied here because a status change or a click can move a row out of them.
async function poll(){if(loading||polling)return;polling=true;const g=gen;
 try{let changed=false,grew=false;
  for(let i=0;i<20;i++){const p=query(false);p.set('since',sync);const d=await get('/api/messages?'+p);if(g!==gen)return;
   for(const m of d.messages){const had=rows.has(m.id);if(maxId!==null&&m.id>maxId){grew=true;bump(m);if(document.hidden&&m.direction==='in')unseen++;}
    if((F.status.length&&!F.status.includes(m.submission_status))||(F.clicks.length&&!F.clicks.includes(clickState(m)))||(boundary&&cmp(m,boundary)>0)){if(had){rows.delete(m.id);changed=true;}continue;}
    rows.set(m.id,m);fresh.add(m.id);changed=true;}
   sync=d.sync_cursor;if(!d.has_more)break;}
  ok();if(grew&&S)showStats();if(changed)render();if((statsStale&&Date.now()-statsAt>600000)||(changed&&maxId===null))await stats(g);title();}
 catch(e){if(g===gen)fail(e,false);}
 finally{polling=false;}}
async function more(){if(!next||loading||paging)return;paging=true;const g=gen;const b=$('more');b.disabled=true;b.textContent='טוען…';
 try{const p=query(true);p.set('cursor',next);const d=await get('/api/messages?'+p);if(g!==gen)return;for(const m of d.messages)rows.set(m.id,m);
  next=d.next_cursor;boundary=d.has_more?d.messages[d.messages.length-1]:null;render();}
 catch(e){if(g===gen)fail(e,false);}
 finally{paging=false;b.disabled=false;b.textContent='טעינת הודעות נוספות';}}
async function tick(){if(stopped)return;if(!sync){if(!loading)await load();}else await poll();}
function schedule(){clearTimeout(timer);if(stopped)return;timer=setTimeout(function(){tick().finally(schedule);},document.hidden?30000:(ME?ME.settings.refresh_seconds:5)*1000);}

// Must match the server's sort expressions so live updates land in the same place.
function key(m){switch(state.sort){case 'time':return m.occurred_at;case 'received':return m.received_at;case 'direction':return m.direction;case 'peer':return m.peer_number;case 'number':return m.system_number;case 'status':return m.submission_status||'';case 'sent_by':return m.sent_by||'';case 'clicks':return m.clicks==null?0:m.clicks+1;default:return String((m.contact&&m.contact[state.sort.slice(2)])||'');}}
function cmp(a,b){const x=key(a),y=key(b);const c=x<y?-1:x>y?1:a.id-b.id;return state.order==='asc'?c:-c;}
function renderHead(){const cols=$('cols'),head=$('head');cols.replaceChildren();head.replaceChildren();let width=0;
 for(const id of visible){const c=col(id);const ce=el('col');if(c.w)ce.style.width=c.w+'px';cols.append(ce);width+=c.w||280;
  const th=el('th');th.scope='col';th.dataset.col=c.id;if(c.sort)th.setAttribute('aria-sort',state.sort===c.sort?(state.order==='asc'?'ascending':'descending'):'none');
  const b=el('button','th-btn');b.type='button';b.setAttribute('aria-haspopup','dialog');b.title='מיון וסינון';b.append(el('span','th-label',c.label));
  if(state.sort===c.sort){const s=el('span','sort-i');s.append(icon(state.order));b.append(s);}
  if(active(c)){const f=el('span','fi');f.title='מסונן';f.append(icon('filter'));b.append(f);}
  b.addEventListener('click',function(){columnMenu(c,th);});th.append(b);head.append(th);}
 $('table').style.minWidth=Math.max(640,width)+'px';}
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
function row(m,now){const open=expanded.has(m.id);const sig=[m.updated_at,open,now,labels.get(m.system_number)||'',visible.join(),JSON.stringify(m.contact),open?JSON.stringify(botInfo.get(m.id)||null):''].join('|');const c=cache.get(m.id);
 if(c&&c.sig===sig&&!fresh.has(m.id))return c.tr;const tr=build(m,open,now);if(fresh.delete(m.id))tr.classList.add('fresh');cache.set(m.id,{tr:tr,sig:sig});return tr;}
function build(m,open,now){const tr=el('tr',m.direction+(open?' open':''));tr.tabIndex=0;tr.dataset.id=String(m.id);tr.setAttribute('aria-expanded',String(open));
 for(const id of visible)tr.append(cell(col(id),m,now));
 if(open){const det=el('div','details');det.append(fact('נקלטה',fullFmt.format(m.received_at)));if(m.time_source==='receipt')det.append(fact('זמן ההודעה','לפי זמן הקליטה'));
  for(const f of ME.contact_fields)if(m.contact&&m.contact[f.id])det.append(fact(f.label,m.contact[f.id]));
  if(m.sent_by)det.append(fact('נשלחה על ידי',m.sent_by));if(m.sender)det.append(fact('נשלחה בשם',/^[+][0-9]+$/.test(m.sender)?local(m.sender):m.sender));const ck=clickState(m);if(ck)det.append(fact('קישורים',(ck==='clicked'?(m.clicks===1?'לחיצה אחת':nf.format(m.clicks)+' לחיצות')+' · ראשונה '+fullFmt.format(m.clicked_at):CLICKS[ck])+(m.auto_clicks?' · '+(m.auto_clicks===1?'פתיחה אוטומטית אחת':nf.format(m.auto_clicks)+' פתיחות אוטומטיות'):'')));if(m.import_id)det.append(fact('מקור','ייבוא מקובץ'));const bi=botInfo.get(m.id);
  if(bi&&bi.answer)det.append(fact('תשובה לבוט',(bi.answer.meaning||bi.answer.answer)+' · '+bi.answer.flow));if(bi&&bi.conversation)det.append(fact('בוט','בשיחה בתהליך '+bi.conversation.flow));if(bi&&bi.blocked)det.append(fact('בוט','מושבת ללקוח הזה'));if(m.provider_message_id)det.append(fact('מזהה ספק',m.provider_message_id));
  const acts=el('div','actions');if(canSend(m.system_number))acts.append(act('reply','השב'));if(ME.can_edit_contacts&&ME.contact_fields.length)acts.append(act('edit','עריכת פרטים'));if(bi&&canSend(m.system_number))acts.append(bi.blocked?act('bot-on','הפעלת הבוט'):act('bot-off','השבתת הבוט'));acts.append(act('copy','העתקת הטקסט'),act('chat','כל השיחה'));det.append(acts);
  (tr.querySelector('.c-msg')||tr.lastChild).append(det);}
 return tr;}
function cell(c,m,now){const td=el('td',c.cls);td.dataset.label=c.label;
 if(c.id==='time'){const w=when(m.occurred_at,now);td.append(el('span','day',w[0]),el('span','clock',w[1]));td.title=fullFmt.format(m.occurred_at)+(m.time_source==='receipt'?' · לפי זמן הקליטה':'');}
 else if(c.id==='received')td.textContent=shortFmt.format(m.received_at);
 else if(c.id==='direction'){const b=el('span','dir '+m.direction);b.append(icon(m.direction),DIR[m.direction]);td.append(b);}
 else if(c.id==='peer'){const pb=el('button','peer phone',local(m.peer_number));pb.type='button';pb.dataset.peer=m.peer_number;pb.title='כל ההודעות עם '+m.peer_number;td.append(pb);}
 else if(c.id==='number'){const label=labels.get(m.system_number);td.append(el('span',label?'num-label':'num-label phone',label||local(m.system_number)));if(label)td.append(el('span','num-sub phone',local(m.system_number)));}
 else if(c.id==='body')td.append(el('div','body',m.body));
 else if(c.id==='status'){const s=m.direction==='out'&&STATUS[m.submission_status];if(s){const b=el('span','badge '+s[1]);b.title=s[3];b.append(icon(s[2]),s[0]);td.append(b);}else td.append(el('span','dash','—'));if(m.is_test)td.append(el('span','tag test','בדיקה'));if(m.import_id)td.append(el('span','tag test','יובאה'));}
 else if(c.id==='clicks'){const k=clickState(m);if(!k)td.append(el('span','dash','—'));else{const b=el('span','badge '+(k==='clicked'?'good':'neutral'));b.append(icon('link'),k==='clicked'?(m.clicks===1?'נלחץ':'נלחץ '+nf.format(m.clicks)+' פעמים'):CLICKS[k]);
   b.title=k==='clicked'?'לחיצה ראשונה: '+fullFmt.format(m.clicked_at):k==='auto'?'הקישור נפתח רק באופן אוטומטי (תצוגה מקדימה או סורק), כנראה לא על ידי הנמען':'הנמען עדיין לא פתח את הקישור';td.append(b);}}
 else{const v=c.id==='sent_by'?m.sent_by:m.contact&&m.contact[c.field];if(v)td.textContent=v;else td.append(el('span','dash','—'));}
 return td;}
function fact(label,value){const e=el('span');e.append(el('b','',label),value);return e;}
function act(name,label){const b=el('button','act');b.type='button';b.dataset.act=name;b.append(icon(name),label);return b;}

// Header menu: sort, the column's filter and a per-column clear.
function columnMenu(c,th){popover(th,function(m){m.setAttribute('aria-label',c.label);
 if(c.sort){m.append(el('div','menu-title','מיון'));for(const o of [['asc','מיון עולה'],['desc','מיון יורד']]){const b=el('button','opt');b.type='button';b.setAttribute('role','menuitemradio');b.setAttribute('aria-checked',String(state.sort===c.sort&&state.order===o[0]));b.append(icon(o[0]),o[1]);b.addEventListener('click',function(){state.sort=c.sort;state.order=o[0];closeMenu();load();});m.append(b);}}
 if(c.filter){if(c.sort)m.append(el('hr'));m.append(el('div','menu-title','סינון'),filterControl(c,load));const clear=el('button','ghost','ניקוי הסינון בעמודה');clear.type='button';clear.disabled=!active(c);clear.addEventListener('click',function(){clearColumn(c);closeMenu();load();});m.append(clear);}});}
function filterControl(c,changed){const box=el('div','check-list');
 if(c.filter==='date'){const pre=el('div','presets');const custom=el('div','range');const from=el('input'),to=el('input'),fromT=el('input'),toT=el('input');from.type=to.type='date';fromT.type=toT.type='time';
  from.value=F.from;to.value=F.to;fromT.value=F.fromTime;toT.value=F.toTime;from.setAttribute('aria-label','מתאריך');fromT.setAttribute('aria-label','משעה');to.setAttribute('aria-label','עד תאריך');toT.setAttribute('aria-label','עד שעה');
  custom.append(el('span','hint','מ־'),from,fromT,el('span','hint','עד'),to,toT);custom.hidden=F.range!=='custom';
  const hours=el('label','hours');const hn=el('input');hn.type='number';hn.min='1';hn.max='720';hn.step='1';hn.inputMode='numeric';hn.placeholder='מספר';hn.value=F.range==='hours'?String(F.hours):'';hours.append(hn,el('span','hint','שעות אחרונות'));
  let ht=0;const applyHours=function(){clearTimeout(ht);const h=Number(hn.value);if(!hn.value||!validHours(h)||(F.range==='hours'&&F.hours===h))return;clearRange();F.range='hours';F.hours=h;for(const x of [from,to,fromT,toT])x.value='';for(const x of pre.children)x.setAttribute('aria-pressed','false');custom.hidden=true;changed();};
  hn.addEventListener('input',function(){clearTimeout(ht);ht=setTimeout(applyHours,500);});hn.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();applyHours();}});
  for(const r of RANGES){const b=el('button','',r[1]);b.type='button';b.setAttribute('aria-pressed',String(F.range===r[0]));b.addEventListener('click',function(){clearRange();F.range=r[0];for(const x of [from,to,fromT,toT,hn])x.value='';for(const x of pre.children)x.setAttribute('aria-pressed',String(x===b));custom.hidden=r[0]!=='custom';changed();});pre.append(b);}
  for(const inp of [from,to,fromT,toT])inp.addEventListener('change',function(){F.from=DATE.test(from.value)?from.value:'';F.to=DATE.test(to.value)?to.value:'';F.fromTime=TIME.test(fromT.value)?fromT.value:'';F.toTime=TIME.test(toT.value)?toT.value:'';changed();});
  box.append(pre,hours,custom);return box;}
 if(c.filter==='set'){for(const o of c.options){const l=el('label','check');const cb=el('input');cb.type='checkbox';cb.checked=F[c.key].includes(o[0]);cb.addEventListener('change',function(){F[c.key]=cb.checked?F[c.key].concat([o[0]]):F[c.key].filter(function(x){return x!==o[0];});changed();});l.append(cb,o[1]);box.append(l);}return box;}
 const inp=el('input');inp.type='search';inp.placeholder='מכיל…';inp.value=F.text[c.param]||'';inp.setAttribute('aria-label',c.label+' מכיל');let t=0;
 const apply=function(){clearTimeout(t);const v=inp.value.trim();if((F.text[c.param]||'')===v)return;if(v)F.text[c.param]=v;else delete F.text[c.param];changed();};
 inp.addEventListener('input',function(){clearTimeout(t);t=setTimeout(apply,400);});inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply();}});box.append(inp);return box;}
function rangeEnd(day,time){return (day?day.split('-').reverse().join('.'):time?'היום':'…')+(time?' '+time:'');}
function chipLabel(c){if(c.filter==='date')return c.label+': '+(F.range==='hours'?(F.hours===1?'שעה אחרונה':F.hours+' שעות אחרונות'):F.range==='custom'?rangeEnd(F.from,F.fromTime)+' – '+rangeEnd(F.to,F.toTime):RANGES.find(function(r){return r[0]===F.range;})[1]);
 if(c.filter==='set')return c.label+': '+c.options.filter(function(o){return F[c.key].includes(o[0]);}).map(function(o){return o[1];}).join(', ');return c.label+' מכיל: '+F.text[c.param];}
function chip(parts,onRemove){const c=el('span','chip');for(const p of parts)c.append(p);const x=el('button');x.type='button';x.title=x.ariaLabel='הסרת הסינון';x.setAttribute('aria-label','הסרת הסינון');x.append(icon('close'));x.addEventListener('click',onRemove);c.append(x);return c;}
function renderChips(){const chips=$('chips');chips.replaceChildren();
 if(state.peer)chips.append(chip(['שיחה עם ',el('span','phone',local(state.peer))],function(){state.peer='';load();}));
 if(state.q)chips.append(chip(['חיפוש: '+state.q],function(){state.q='';$('q').value='';load();}));
 for(const c of COLS)if(active(c))chips.append(chip([chipLabel(c)],function(){clearColumn(c);load();}));
 if(filtered()){const b=el('button','ghost','ניקוי כל הסינונים');b.type='button';b.addEventListener('click',clearAll);chips.append(b);}}
function clearAll(){state.q='';state.peer='';clearRange();F.dir=[];F.status=[];F.num=[];F.clicks=[];F.text={};$('q').value='';closeMenu();load();}
function openPeer(n){state.peer=n;if(state.sort==='peer'){state.sort='time';state.order='desc';}load();}
// Bot state for an opened message (the answer it gave, an ongoing conversation, or the bot turned off), loaded on demand.
const botInfo=new Map();
function loadBotInfo(m){if(!(ME.flows&&ME.flows.length))return;get('/api/bot/info?id='+m.id).then(function(d){botInfo.set(m.id,d);render();}).catch(function(){});}
async function setBot(m,blocked){try{await post('/api/bot/block',{system_number:m.system_number,peer_number:m.peer_number,blocked:blocked});for(const x of rows.values())if(x.peer_number===m.peer_number&&x.system_number===m.system_number)botInfo.delete(x.id);toast(blocked?'הבוט הושבת ללקוח הזה':'הבוט הופעל מחדש ללקוח הזה');loadBotInfo(m);}catch(e){toast(message(e));}}
function toggle(id){if(expanded.has(id))expanded.delete(id);else{expanded.add(id);const m=rows.get(id);if(m&&!botInfo.has(id))loadBotInfo(m);}render();const c=cache.get(id);if(c&&document.activeElement!==c.tr)c.tr.focus({preventScroll:true});}
function copy(text){if(!navigator.clipboard){toast('ההעתקה אינה נתמכת בדפדפן זה');return;}navigator.clipboard.writeText(text).then(function(){toast('הטקסט הועתק');},function(){toast('ההעתקה נכשלה');});}
// Visible columns are saved per user and are also the default columns for an export.
function applyColumns(save){renderHead();cache.clear();$('rows').replaceChildren();render();if(save){clearTimeout(saveTimer);saveTimer=setTimeout(function(){post('/api/me/prefs',{columns:visible}).catch(function(){toast('שמירת העמודות נכשלה');});},600);}}
function columnsMenu(){popover($('columns-btn'),function(m){m.append(el('div','menu-title','עמודות מוצגות'));const box=el('div','check-list');
 for(const c of COLS){const l=el('label','check');const cb=el('input');cb.type='checkbox';cb.checked=visible.includes(c.id);cb.addEventListener('change',function(){const next=cb.checked?order(visible.concat([c.id])):visible.filter(function(id){return id!==c.id;});if(!next.length){cb.checked=true;return;}visible=next;applyColumns(true);});l.append(cb,c.label);box.append(l);}
 
 const reset=el('button','ghost','חזרה לברירת המחדל');reset.type='button';reset.addEventListener('click',function(){visible=order(defaultColumns());applyColumns(true);closeMenu();});m.append(box,reset);if(ME.role==='admin'){const manage=el('a','ghost','ניהול שדות אנשי קשר');manage.href='/admin#fields';m.append(manage);}});}
function filterDialog(){const sel=$('fd-sort');sel.replaceChildren();for(const c of COLS)if(c.sort)for(const o of [['asc','עולה'],['desc','יורד']]){const opt=el('option','',c.label+' · '+o[1]);opt.value=c.sort+':'+o[0];sel.append(opt);}sel.value=state.sort+':'+state.order;
 const body=$('fd-body');body.replaceChildren();for(const c of COLS)if(c.filter){const s=el('div','fd-section');s.append(el('div','menu-title',c.label),filterControl(c,load));body.append(s);}$('filter-dlg').showModal();}

$('q').value='';$('q').addEventListener('input',function(){clearTimeout(debounce);debounce=setTimeout(function(){const v=$('q').value.trim();if(v!==state.q){state.q=v;load();}},350);});
$('filters').addEventListener('submit',function(e){e.preventDefault();clearTimeout(debounce);const v=$('q').value.trim();if(v!==state.q){state.q=v;load();}});
$('columns-btn').addEventListener('click',columnsMenu);
$('filters-btn').addEventListener('click',filterDialog);
$('fd-sort').addEventListener('change',function(){const v=this.value.split(':');state.order=v.pop();state.sort=v.join(':');load();});
$('fd-clear').addEventListener('click',function(){clearAll();filterDialog();});
for(const id of ['fd-close','fd-done'])$(id).addEventListener('click',function(){$('filter-dlg').close();});
$('empty-clear').addEventListener('click',clearAll);
$('reload').addEventListener('click',function(){location.reload();});
$('more').addEventListener('click',more);
if('IntersectionObserver' in window)new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting;}))more();},{rootMargin:'200px'}).observe($('more-row'));
$('rows').addEventListener('click',function(e){const t=e.target;const pb=t.closest('button.peer');if(pb){openPeer(pb.dataset.peer);return;}
 const tr=t.closest('tr');const m=tr&&rows.get(Number(tr.dataset.id));if(!m)return;const a=t.closest('button[data-act]');
 if(a){if(a.dataset.act==='copy')copy(m.body);else if(a.dataset.act==='reply')openCompose(m.system_number,m.peer_number);else if(a.dataset.act==='edit')openContact(m);else if(a.dataset.act==='bot-on'||a.dataset.act==='bot-off')setBot(m,a.dataset.act==='bot-off');else openPeer(m.peer_number);return;}
 if(t.closest('.details')||String(getSelection()).length)return;toggle(m.id);});
$('rows').addEventListener('keydown',function(e){if(e.target.tagName==='TR'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(Number(e.target.dataset.id));}});
document.addEventListener('keydown',function(e){const tag=document.activeElement&&document.activeElement.tagName;if(e.key==='/'&&tag!=='INPUT'&&tag!=='SELECT'&&tag!=='TEXTAREA'){e.preventDefault();$('q').focus();}});
document.addEventListener('visibilitychange',function(){if(document.hidden)return;unseen=0;title();clearTimeout(timer);tick().finally(schedule);});

// Contact details, shared by everyone. Only changed fields are sent, so concurrent edits of different fields both survive.
let CE=null;
const CONTACT_ERRORS={'You may not edit contact details':'אין לך הרשאה לערוך פרטי לקוחות.','This number is not in your messages':'אפשר לערוך רק לקוחות שמופיעים בהודעות של המספרים שלך.'};
function openContact(m){CE={number:m.peer_number,orig:Object.assign({},m.contact||{})};$('ce-number').textContent=local(m.peer_number);const box=$('ce-fields');box.replaceChildren();
 for(const f of ME.contact_fields){const l=el('label','fld');const inp=el('input');inp.maxLength=200;inp.dataset.field=f.id;inp.value=CE.orig[f.id]||'';l.append(el('span','',f.label),inp);box.append(l);}
 $('ce-error').hidden=true;$('ce-save').disabled=false;$('ce-dlg').showModal();const first=box.querySelector('input');if(first)first.focus();}
$('ce-form').addEventListener('submit',async function(e){e.preventDefault();if(!CE)return;const data={};
 for(const inp of $('ce-fields').querySelectorAll('input')){const v=inp.value.trim();if(v!==(CE.orig[inp.dataset.field]||''))data[inp.dataset.field]=v;}
 if(!Object.keys(data).length){$('ce-dlg').close();return;}$('ce-save').disabled=true;$('ce-error').hidden=true;
 try{const d=await post('/api/contacts/save',{number:CE.number,data:data});for(const m of rows.values())if(m.peer_number===d.number)m.contact=d.data;$('ce-dlg').close();toast('פרטי הלקוח נשמרו');render();}
 catch(err){$('ce-error').hidden=false;$('ce-error').textContent=CONTACT_ERRORS[err.message]||message(err);}finally{$('ce-save').disabled=false;}});
for(const id of ['ce-close','ce-cancel'])$(id).addEventListener('click',function(){$('ce-dlg').close();});

// Export: every message matching the current filters and sort, fetched page by page and turned into a file in the browser.
let exportFormat='xlsx',exporting=false;
const exportFmt=new Intl.DateTimeFormat('he-IL',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
// Two kinds of export: every message (one row per message), or one row per customer with their contact data,
// message counts and latest message, grouped on the server.
let exportRows='messages';
function peerCols(){return [{id:'peer',label:'לקוח'}].concat(ME.contact_fields.map(function(f){return {id:'c:'+f.id,field:f.id,label:f.label};}),[{id:'total',label:'מספר הודעות'},{id:'incoming',label:'נכנסות'},{id:'outgoing',label:'יוצאות'},{id:'last_at',label:'הודעה אחרונה'},{id:'last_direction',label:'כיוון ההודעה האחרונה'},{id:'last_body',label:'תוכן ההודעה האחרונה'},{id:'last_number',label:'מספר מערכת אחרון'},{id:'opted_out',label:'ברשימת ההסרה'}]);}
function exportCols(){return exportRows==='peers'?peerCols():COLS;}
function renderExportCols(){const box=$('ex-cols');box.replaceChildren();const pick=exportRows==='peers'?function(c){return c.id==='peer'||c.id==='total'||c.id==='last_at'||c.id==='last_body'||(c.field&&visible.includes(c.id));}:function(c){return visible.includes(c.id);};
 for(const c of exportCols()){const l=el('label','check');const cb=el('input');cb.type='checkbox';cb.value=c.id;cb.checked=pick(c);l.append(cb,c.label);box.append(l);}$('ex-all-fields').hidden=!ME.contact_fields.length;
 $('ex-count').textContent=exportRows==='peers'?(S&&S.peers!==undefined?'ייוצאו '+nf.format(Math.min(S.peers,50000))+' לקוחות, שורה אחת לכל מספר, לפי הסינון הנוכחי.':'ייוצא כל לקוח שיש לו הודעות לפי הסינון הנוכחי, שורה אחת לכל מספר.'):total!==null?'ייוצאו '+nf.format(Math.min(total,50000))+' הודעות לפי הסינון והמיון הנוכחיים'+(total>50000?' (עד 50,000)':'')+'.':'ייוצאו כל ההודעות לפי הסינון והמיון הנוכחיים.';}
for(const b of document.querySelectorAll('[data-rows]'))b.addEventListener('click',function(){exportRows=b.dataset.rows;for(const x of document.querySelectorAll('[data-rows]'))x.setAttribute('aria-pressed',String(x===b));renderExportCols();});
$('ex-all-fields').addEventListener('click',function(){for(const cb of $('ex-cols').querySelectorAll('input'))if(cb.value.indexOf('c:')===0)cb.checked=true;});
function openExport(){renderExportCols();
 $('ex-error').hidden=true;$('ex-bar').hidden=true;$('ex-status').textContent='';$('ex-go').disabled=false;$('export-dlg').showModal();}
for(const b of document.querySelectorAll('[data-format]'))b.addEventListener('click',function(){exportFormat=b.dataset.format;for(const x of document.querySelectorAll('[data-format]'))x.setAttribute('aria-pressed',String(x===b));});
function exportValue(c,m){switch(c.id){case 'time':return exportFmt.format(m.occurred_at);case 'received':return exportFmt.format(m.received_at);case 'direction':return DIR[m.direction];case 'peer':return local(m.peer_number);
 case 'number':return (labels.get(m.system_number)?labels.get(m.system_number)+' ':'')+local(m.system_number);case 'body':return m.body;case 'status':return (m.direction==='out'&&STATUS[m.submission_status]?STATUS[m.submission_status][0]:'')+(m.is_test?' (בדיקה)':'');case 'sent_by':return m.sent_by||'';case 'clicks':{const k=clickState(m);return !k?'':k==='clicked'?(m.clicks===1?'נלחץ':'נלחץ '+m.clicks+' פעמים')+' ('+exportFmt.format(m.clicked_at)+')':CLICKS[k];}default:return (m.contact&&m.contact[c.field])||'';}}
// CSV cells that start like a formula are prefixed with ' so spreadsheet apps show them as text.
function csvCell(v,safe){let s=String(v==null?'':v);if(!safe&&/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function csvBlob(defs,head,data){const safe=defs.map(function(c){return ['time','received','peer','number','last_at','last_number','total','incoming','outgoing'].includes(c.id);});const lines=[head].concat(data).map(function(r){return r.map(function(v,i){return csvCell(v,safe[i]);}).join(',');});return new Blob([String.fromCharCode(0xfeff)+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});}
const CRC=(function(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
// Minimal zip writer (deflate via the browser's CompressionStream) for the .xlsx package.
async function zip(files){const enc=new TextEncoder();const parts=[],central=[];let offset=0;
 for(const f of files){const name=enc.encode(f.name),raw=enc.encode(f.text),crc=crc32(raw);const comp=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const h=new Uint8Array(30+name.length),hv=new DataView(h.buffer);hv.setUint32(0,0x04034b50,true);hv.setUint16(4,20,true);hv.setUint16(6,0x0800,true);hv.setUint16(8,8,true);hv.setUint16(12,0x21,true);hv.setUint32(14,crc,true);hv.setUint32(18,comp.length,true);hv.setUint32(22,raw.length,true);hv.setUint16(26,name.length,true);h.set(name,30);
  const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,8,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,comp.length,true);cv.setUint32(24,raw.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);
  parts.push(h,comp);central.push(c);offset+=h.length+comp.length;}
 const size=central.reduce(function(a,c){return a+c.length;},0);const e=new Uint8Array(22),ev=new DataView(e.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
 return new Blob(parts.concat(central,[e]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
function xmlText(v){return String(v==null?'':v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// Every cell is an inline string, so phone numbers keep their leading zero; the sheet opens right-to-left.
function xlsxBlob(head,data,widths){const NS='http://schemas.openxmlformats.org/',X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';const line=function(r){return '<row>'+r.map(function(v){return '<c t="inlineStr"><is><t xml:space="preserve">'+xmlText(v)+'</t></is></c>';}).join('')+'</row>';};
 return zip([{name:'[Content_Types].xml',text:X+'<Types xmlns="'+NS+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
  {name:'_rels/.rels',text:X+'<Relationships xmlns="'+NS+'package/2006/relationships"><Relationship Id="rId1" Type="'+NS+'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
  {name:'xl/workbook.xml',text:X+'<workbook xmlns="'+NS+'spreadsheetml/2006/main" xmlns:r="'+NS+'officeDocument/2006/relationships"><sheets><sheet name="הודעות" sheetId="1" r:id="rId1"/></sheets></workbook>'},
  {name:'xl/_rels/workbook.xml.rels',text:X+'<Relationships xmlns="'+NS+'package/2006/relationships"><Relationship Id="rId1" Type="'+NS+'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},
  {name:'xl/worksheets/sheet1.xml',text:X+'<worksheet xmlns="'+NS+'spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><cols>'+widths.map(function(w,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>';}).join('')+'</cols><sheetData>'+[head].concat(data).map(line).join('')+'</sheetData></worksheet>'}]);}
function download(blob,name){const a=el('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},20000);}
$('ex-form').addEventListener('submit',async function(e){e.preventDefault();if(exporting)return;const ids=Array.from($('ex-cols').querySelectorAll('input:checked')).map(function(i){return i.value;});
 if(!ids.length){$('ex-error').hidden=false;$('ex-error').textContent='יש לבחור לפחות עמודה אחת';return;}
 if(exportRows==='peers'){exportPeers(ids);return;}
 exporting=true;$('ex-go').disabled=true;$('ex-error').hidden=true;$('ex-bar').hidden=false;$('ex-progress').style.width='0';const defs=order(ids).map(col);const found=[];let cursor=null;
 try{const base=query(true);base.set('limit','500');base.set('export','1');base.set('format',exportFormat);base.set('columns',defs.map(function(c){return c.id;}).join(','));
  for(;;){const p=new URLSearchParams(base);if(cursor)p.set('cursor',cursor);const d=await get('/api/messages?'+p);for(const m of d.messages)found.push(m);cursor=d.next_cursor;
   $('ex-status').textContent='נטענו '+nf.format(found.length)+' הודעות';$('ex-progress').style.width=(total?Math.min(100,found.length/Math.min(total,50000)*100):50)+'%';if(!cursor||found.length>=50000)break;}
  const head=defs.map(function(c){return c.label;});const data=found.slice(0,50000).map(function(m){return defs.map(function(c){return exportValue(c,m);});});$('ex-status').textContent='יוצר קובץ…';
  download(exportFormat==='csv'?csvBlob(defs,head,data):await xlsxBlob(head,data,defs.map(function(c){return {body:60,direction:9,status:14,clicks:28,sent_by:28,number:24,peer:15,time:20,received:20}[c.id]||18;})),'sms-'+today()+'.'+exportFormat);$('export-dlg').close();toast('יוצאו '+nf.format(data.length)+' הודעות');}
 catch(err){$('ex-error').hidden=false;$('ex-error').textContent=message(err);}
 finally{exporting=false;$('ex-go').disabled=false;}});
function peerValue(c,r){switch(c.id){case 'peer':return local(r.peer_number);case 'total':return String(r.total);case 'incoming':return String(r.incoming);case 'outgoing':return String(r.outgoing);case 'last_at':return exportFmt.format(r.last_at);
 case 'last_direction':return DIR[r.last_direction];case 'last_body':return r.last_body;case 'last_number':return (labels.get(r.last_number)?labels.get(r.last_number)+' ':'')+local(r.last_number);case 'opted_out':return r.opted_out?'כן':'לא';default:return (r.contact&&r.contact[c.field])||'';}}
async function exportPeers(ids){exporting=true;$('ex-go').disabled=true;$('ex-error').hidden=true;$('ex-bar').hidden=false;$('ex-progress').style.width='30%';$('ex-status').textContent='מקבץ לפי מספר…';
 const all=peerCols();const defs=all.filter(function(c){return ids.includes(c.id);});
 try{const p=query(true);p.set('export','1');p.set('group','peer');p.set('format',exportFormat);p.set('columns',defs.map(function(c){return c.id;}).join(','));const d=await get('/api/messages?'+p);
  const head=defs.map(function(c){return c.label;});const data=d.peers.map(function(r){return defs.map(function(c){return peerValue(c,r);});});$('ex-progress').style.width='80%';$('ex-status').textContent='יוצר קובץ…';
  download(exportFormat==='csv'?csvBlob(defs,head,data):await xlsxBlob(head,data,defs.map(function(c){return {peer:15,last_body:60,last_at:20,last_number:24,last_direction:12,total:10,incoming:10,outgoing:10,opted_out:12}[c.id]||18;})),'contacts-'+today()+'.'+exportFormat);
  $('export-dlg').close();toast('יוצאו '+plural(data.length,'לקוח אחד','לקוחות')+(d.truncated?' (עד 50,000)':''));}
 catch(err){$('ex-error').hidden=false;$('ex-error').textContent=message(err);}
 finally{exporting=false;$('ex-go').disabled=false;}}
$('export-btn').addEventListener('click',openExport);
for(const id of ['ex-close','ex-cancel'])$(id).addEventListener('click',function(){$('export-dlg').close();});

// Distribution lists: private to their owner, or shared by an admin with everyone.
let LISTS=null,EDIT=null;const listNumbers=new Map();
async function loadLists(){try{LISTS=(await get('/api/lists')).lists;}catch(e){toast(message(e));LISTS=LISTS||[];}renderLists();renderComposeLists();}
function renderLists(){const box=$('ld-rows');box.replaceChildren();for(const l of LISTS||[]){const b=el('button','list-row');b.type='button';b.append(el('span','list-name',l.name));if(l.shared)b.append(el('span','tag accent','משותפת'));b.append(el('span','hint end',plural(l.size,'מספר אחד','מספרים')));b.addEventListener('click',function(){editList(l.id);});box.append(b);}
 if(LISTS&&!LISTS.length)box.append(el('p','hint','עדיין אין רשימות. אפשר ליצור רשימה כאן או לשמור נמענים מחלון ההודעה.'));}
function showListIndex(){$('ld-index').hidden=false;$('ld-edit').hidden=true;EDIT=null;}
async function openLists(){showListIndex();$('lists-dlg').showModal();await loadLists();}
async function editList(id,seed){let l={id:null,name:'',shared:0,editable:true,numbers:seed||[]};if(id){try{l=await get('/api/lists/members?id='+id);}catch(e){toast(message(e));return;}}
 EDIT={id:l.id,editable:l.editable,members:new Set(l.numbers)};$('le-name').value=l.name;$('le-shared').checked=!!l.shared;$('le-shared-row').hidden=ME.role!=='admin';
 for(const x of ['le-name','le-shared','le-add','le-add-btn'])$(x).disabled=!l.editable;$('le-file-btn').hidden=!l.editable;$('le-delete').hidden=!l.id||!l.editable;$('le-save').hidden=!l.editable;
 $('le-error').hidden=true;$('le-q').value='';$('le-add').value='';LIMPORT=null;$('le-import').hidden=true;$('ld-index').hidden=true;$('ld-edit').hidden=false;if(!$('lists-dlg').open)$('lists-dlg').showModal();renderMembers();$('le-name').focus();}
function renderMembers(){const q=$('le-q').value.replace(/[^0-9+]/g,'');const box=$('le-members');box.replaceChildren();let shown=0;
 for(const n of EDIT.members){if(q&&n.indexOf(q.replace(/^0/,''))<0&&local(n).replace(/-/g,'').indexOf(q)<0)continue;if(++shown>300)break;const r=el('div','member');r.append(el('span','phone',local(n)));
  if(EDIT.editable){const x=el('button','icon-btn');x.type='button';x.setAttribute('aria-label','הסרת '+local(n));x.append(icon('close'));x.addEventListener('click',function(){EDIT.members.delete(n);renderMembers();});r.append(x);}box.append(r);}
 $('le-count').textContent=plural(EDIT.members.size,'מספר אחד','מספרים')+(shown>300?' · מוצגים 300 הראשונים':'');}
// Adds typed or imported values ({row,value}) and reports every value that was not added, with the reason.
function addMembers(items,note){note=note||'';let added=0;const problems=[],before=new Set(EDIT.members),seen=new Set();
 for(const it of items)for(const p of phonesIn(it.value)){if(!p.number){problems.push({row:it.row,value:p.value,reason:PHONE_PROBLEMS[p.problem]});continue;}
  if(seen.has(p.number)){problems.push({row:it.row,value:p.value,reason:'מופיע יותר מפעם אחת בקובץ'});continue;}seen.add(p.number);
  if(before.has(p.number)){problems.push({row:it.row,value:p.value,reason:'כבר ברשימה'});continue;}EDIT.members.add(p.number);added++;}
 renderMembers();const bad=problems.length;if(!bad){toast(plural(added,'נוסף מספר אחד','מספרים נוספו')+note);return;}
 showReport('מספרים שלא נוספו',plural(added,'נוסף מספר אחד','מספרים נוספו')+' · '+plural(bad,'ערך אחד לא נוסף','ערכים לא נוספו')+note+'. השינוי יישמר ברשימה רק אחרי לחיצה על "שמירה".',problems);}
$('le-add-btn').addEventListener('click',function(){addMembers($('le-add').value.split(/[;\n]+/).map(function(v){return {row:0,value:v};}));$('le-add').value='';});
// File import: pick one column or all of them; row numbers in the report match the file.
let LIMPORT=null;
$('le-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;
 try{if(f.size>5242880)throw new Error('הקובץ גדול מדי (עד 5MB)');const r=await readRows(f);if(!r.length)throw new Error('הקובץ ריק');const pc=phoneColumn(r);LIMPORT={rows:r,width:pc.width};const sel=$('le-column');sel.replaceChildren();
  const all=el('option','','כל העמודות');all.value='all';sel.append(all);for(let c=0;c<pc.width;c++){const o=el('option','',(pc.header&&r[0][c]?r[0][c]:'עמודה '+(c+1))+(pc.scores[c]?' ('+nf.format(pc.scores[c])+' מספרים)':''));o.value=String(c);sel.append(o);}
  sel.value=pc.scores.filter(function(x){return x>0;}).length>1?'all':String(pc.best);$('le-header').checked=pc.header;$('le-import-info').textContent=f.name+' · '+plural(r.length,'שורה אחת','שורות');$('le-import').hidden=false;}
 catch(e){toast('לא ניתן לקרוא את הקובץ: '+(e.message||e));}});
// Empty rows are counted in the summary, so the totals match the number of rows in the file.
$('le-import-add').addEventListener('click',function(){if(!LIMPORT)return;const c=$('le-column').value;const items=[];let empty=0;
 for(let i=$('le-header').checked?1:0;i<LIMPORT.rows.length;i++){const r=LIMPORT.rows[i];const cols=c==='all'?r.map(function(_,k){return k;}):[Number(c)];let any=false;for(const k of cols){const v=String(r[k]||'').trim();if(v&&(c!=='all'||/[0-9]/.test(v))){items.push({row:i+1,value:v});any=true;}}if(!any)empty++;}
 LIMPORT=null;$('le-import').hidden=true;addMembers(items,empty?' · '+plural(empty,'שורה ריקה אחת דולגה','שורות ריקות דולגו'):'');});
$('le-import-clear').addEventListener('click',function(){LIMPORT=null;$('le-import').hidden=true;});
$('le-q').addEventListener('input',renderMembers);
$('ld-edit').addEventListener('submit',async function(e){e.preventDefault();if(!EDIT||!EDIT.editable)return;$('le-save').disabled=true;$('le-error').hidden=true;
 try{const d=await post('/api/lists/save',{id:EDIT.id,name:$('le-name').value,shared:$('le-shared').checked,numbers:Array.from(EDIT.members)});listNumbers.delete(d.id);toast('הרשימה נשמרה ('+plural(d.size,'מספר אחד','מספרים')+')');showListIndex();await loadLists();}
 catch(err){$('le-error').hidden=false;$('le-error').textContent=message(err);}finally{$('le-save').disabled=false;}});
$('le-delete').addEventListener('click',async function(){if(!EDIT||!EDIT.id)return;const id=EDIT.id;if(!await confirmAction('מחיקת רשימה','למחוק את הרשימה "'+$('le-name').value+'"? המספרים עצמם לא יימחקו מהמערכת.','מחיקה'))return;
 try{await post('/api/lists/delete',{id:id});listNumbers.delete(id);C.lists.delete(id);toast('הרשימה נמחקה');showListIndex();await loadLists();}catch(err){toast(message(err));}});
$('le-back').addEventListener('click',showListIndex);
$('ld-new').addEventListener('click',function(){editList(null);});
$('ld-close').addEventListener('click',function(){$('lists-dlg').close();});
$('lists-btn').addEventListener('click',openLists);

// Compose. The send ID is created when the panel opens and kept across retries of a failed request,
// so the server can tell a retry from a new send; it is only replaced after a send the provider rejected.
const C={id:null,rows:null,file:'',imported:[],lists:new Set(),confirm:false,sending:false,batches:null,preview:''};
// Message variables, as in shared/template.ts: {field name}, {field name|default}, {טלפון}.
const VAR_RE=/\{([^{}|\n]{1,30})(?:\|([^{}\n]{0,60}))?\}/g;const PERSONAL_BATCH=40;
function varNames(){return ME.contact_fields.map(function(f){return f.label;}).concat(['טלפון']);}
function usedVars(t){return Array.from(t.matchAll(VAR_RE)).map(function(m){return m[1].trim();});}
function insertVar(name){const ta=$('c-body');if(ta.readOnly)return;const a=ta.selectionStart==null?ta.value.length:ta.selectionStart,b=ta.selectionEnd==null?a:ta.selectionEnd;const v='{'+name+'}';
 ta.value=ta.value.slice(0,a)+v+ta.value.slice(b);ta.selectionStart=ta.selectionEnd=a+v.length;closeMenu();ta.focus();edited();}
$('c-vars').addEventListener('click',function(){popover($('c-vars'),function(m){m.append(el('div','menu-title','משתנים'));for(const n of varNames()){const b=el('button','opt','{'+n+'}');b.type='button';b.addEventListener('click',function(){insertVar(n);});m.append(b);}
 m.append(el('hr'),el('p','hint','כל משתנה מוחלף בפרטי הנמען. משתנה ריק יוסר, או שאפשר לקבוע ערך חלופי: {שם|לקוח יקר}.'));});});
// Preview for the first recipient, rendered by the server with their contact data.
let previewTimer=0;
function schedulePreview(n0){const body=$('c-body').value;const key=JSON.stringify([$('c-from').value,n0,body,$('c-sender').value]);if(key===C.preview)return;C.preview=key;clearTimeout(previewTimer);
 previewTimer=setTimeout(function(){post('/api/send/preview',{system_number:$('c-from').value,recipient:n0,body:body,bulk:recipients().list.length>1,sender:!!senderChoice()}).then(function(d){if(C.preview!==key)return;$('c-vars-hint').textContent='לדוגמה ל-'+local(n0)+':\n'+d.body;}).catch(function(){});},500);}
function senders(){return ME?ME.numbers.filter(function(n){return n.can_send;}):[];}
function canSend(number){return senders().some(function(n){return n.number===number;});}
function openCompose(from,to){const list=senders();if(!list.length)return;const sel=$('c-from');sel.replaceChildren();
 for(const n of list){const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;sel.append(o);}if(from&&canSend(from))sel.value=from;
 Object.assign(C,{id:crypto.randomUUID(),rows:null,file:'',imported:[],lists:new Set(),confirm:false,sending:false,batches:null,preview:''});
 const soon=Date.now()+3600000;$('c-later').checked=false;$('c-later-row').hidden=true;$('c-later-date').value=ymd(soon);const z=zoned(soon);$('c-later-time').value=pad(z.hour)+':00';
 $('c-to').value=to?local(to):'';$('c-body').value='';$('c-import').hidden=true;$('c-error').hidden=true;$('c-file-btn').hidden=$('c-save-list').hidden=!ME.can_bulk_send;
 $('c-test').value=ME.test_number?local(ME.test_number):'';$('c-test-save').checked=false;renderComposeLists();if(ME.can_bulk_send&&LISTS===null)loadLists();
 const ss=$('c-sender');ss.replaceChildren();const sys=el('option','','מספר המערכת (ברירת מחדל)');sys.value='';ss.append(sys);for(const x of (ME.senders||[])){const o=el('option','',senderLabel(x));o.value=String(x.id);ss.append(o);}$('c-sender-row').hidden=!(ME.senders||[]).length;$('c-sender-note').hidden=true;
 $('c-body').readOnly=false;$('c-stop-bot').checked=false;$('c-track').checked=false;renderComposeFlows();updateCompose();$('compose').showModal();(to?$('c-body'):$('c-to')).focus();}
// Bot flows of the chosen number. Choosing one makes its first step the message and starts the flow for the recipients.
function composeFlows(){return (ME.flows||[]).filter(function(f){return f.system_number===$('c-from').value;});}
function renderComposeFlows(){const list=composeFlows();const sel=$('c-flow');const was=sel.value;sel.replaceChildren();const none=el('option','','בלי תהליך');none.value='';sel.append(none);
 for(const f of list){const o=el('option','',f.name);o.value=String(f.id);sel.append(o);}sel.value=list.some(function(f){return String(f.id)===was;})?was:'';$('c-flow-row').hidden=!list.length;applyComposeFlow();}
function applyComposeFlow(){const f=composeFlows().find(function(x){return String(x.id)===$('c-flow').value;});const was=$('c-body').readOnly;$('c-flow-hint').hidden=!f;$('c-stop-row').hidden=!!f;$('c-body').readOnly=!!f;
 if(f)$('c-body').value=f.first;else if(was)$('c-body').value='';}
function renderComposeLists(){const box=$('c-lists');box.replaceChildren();const show=ME.can_bulk_send&&LISTS&&LISTS.length>0;$('c-lists-row').hidden=!show;if(!show)return;
 for(const l of LISTS){const lab=el('label','check');const cb=el('input');cb.type='checkbox';cb.checked=C.lists.has(l.id);cb.addEventListener('change',async function(){if(!cb.checked){C.lists.delete(l.id);edited();return;}
   try{if(!listNumbers.has(l.id))listNumbers.set(l.id,(await get('/api/lists/members?id='+l.id)).numbers);C.lists.add(l.id);}catch(e){cb.checked=false;composeError(message(e));}edited();});
  lab.append(cb,l.name+' ('+nf.format(l.size)+')');box.append(lab);}}
// Typed entries, imported cells ({row,value}) and list members. Each rejected value keeps its reason for the report.
function recipients(){const typed=$('c-to').value.split(/[;\n]+/).map(function(s){return {row:0,value:s.trim()};}).filter(function(x){return x.value;});
 let all=typed.concat(C.imported);for(const id of C.lists)all=all.concat((listNumbers.get(id)||[]).map(function(n){return {row:0,value:n};}));const valid=new Set(),invalid=[];let found=0;
 for(const it of all)for(const p of phonesIn(it.value)){if(!p.number){invalid.push({row:it.row,value:p.value,reason:PHONE_PROBLEMS[p.problem]});continue;}
  if(!ME.settings.allow_international&&p.number.indexOf('+972')!==0){invalid.push({row:it.row,value:p.value,reason:'מספר מחוץ לישראל (שליחה לחו״ל כבויה בהגדרות)'});continue;}found++;valid.add(p.number);}
 return {list:Array.from(valid),invalid:invalid,duplicates:found-valid.size};}
// Micropay bills 70 characters for a single Hebrew SMS and 67 per part after that (140 and 134 in English).
function segments(text){const len=text.replace(/\n/g,'\r\n').length;if(!len)return 0;const uni=/[^\x00-\x7f]/.test(text);return len<=(uni?70:140)?1:Math.ceil(len/(uni?67:134));}
function finalBody(n){let b=$('c-body').value;if(tracking())b=sampleLinks(b);if(n>1&&senderChoice())return ME.settings.optout_link_text?b+'\n'+optoutLine():b;const t=ME.settings.optout_text;if(n>1&&t&&b.indexOf(t)<0)b+='\n'+t;return b;}
// Sender IDs an admin assigned to this user (shared/dispatch.ts). Replies to them don't reach the system, so a bot flow
// can't start from one, and a send to several recipients ends with a personal opt-out link instead of "reply to opt out".
function senderChoice(){const v=$('c-sender-row').hidden?'':$('c-sender').value;return v?(ME.senders||[]).find(function(x){return String(x.id)===v;})||null:null;}
function senderLabel(x){return (x.label?x.label+' · ':'')+(x.kind==='phone'?local(x.value):x.value);}
function optoutLine(){return ME.settings.optout_link_text.replace('{קישור}',ME.settings.link_base+'/x/Q7mP2aK');}
function applySender(){const x=senderChoice();const note=$('c-sender-note');note.hidden=!x;
 if(x)note.textContent=x.kind==='phone'?'הנמענים יראו את '+local(x.value)+' כשולח. תשובות שלהם יגיעו למספר הזה ולא למערכת, ולכן אין תהליך בוט, וההסרה היא בקישור.':'הנמענים יראו את '+x.value+' כשולח ולא יוכלו להשיב. אין תהליך בוט, וההסרה היא בקישור.';
 if(x){$('c-flow').value='';applyComposeFlow();$('c-flow-row').hidden=true;}else renderComposeFlows();}
// Link tracking (shared/links.ts): each link becomes a short link of its own for every recipient. Lengths are counted
// with a sample code, which is as long as the real ones.
function tracking(){return !!ME.settings.link_base&&!$('c-track-row').hidden&&$('c-track').checked;}
function sampleLinks(b){let out='',at=0;for(const f of findLinks(b)){if(f.url.toLowerCase().indexOf(ME.settings.link_base+'/')===0)continue;out+=b.slice(at,f.start)+ME.settings.link_base+'/Ab3xY9k';at=f.end;}return out+b.slice(at);}
function updateCompose(){const r=recipients();const n=r.list.length;const sender=senderChoice();const links=ME.settings.link_base?findLinks($('c-body').value).length:0;$('c-track-row').hidden=!links;
 const body=finalBody(n);const seg=segments(body);
 $('c-track-hint').textContent=!tracking()?(links===1?'הקישור בהודעה יישלח כמו שהוא.':'הקישורים בהודעה יישלחו כמו שהם.')+' סימון האפשרות מחליף כל קישור בקישור מקוצר אישי לכל נמען, וכך אפשר לראות בטבלה מי לחץ.':
  (links===1?'הקישור יוחלף':'כל אחד מ-'+links+' הקישורים יוחלף')+' בקישור אישי לכל נמען, למשל '+ME.settings.link_base+'/Ab3xY9k. הלחיצות יופיעו בעמודה "לחיצות".'+(n>PERSONAL_BATCH&&!ME.settings.micropay_listjson?' ההודעה תישלח בקבוצות של '+PERSONAL_BATCH+' נמענים.':'');
 $('c-summary').textContent=n?nf.format(n)+(n===1?' נמען':' נמענים')+(r.duplicates?' · '+(r.duplicates===1?'כפילות אחת הוסרה':nf.format(r.duplicates)+' כפילויות הוסרו'):''):'עדיין לא הוזנו נמענים';
 $('c-invalid').hidden=!r.invalid.length;$('c-invalid-text').textContent=r.invalid.length?(r.invalid.length===1?'מספר לא תקין שלא יישלח: ':nf.format(r.invalid.length)+' מספרים לא תקינים שלא יישלחו: ')+r.invalid.slice(0,4).map(function(x){return x.value;}).join(', ')+(r.invalid.length>4?'…':''):'';
 const vars=usedVars($('c-body').value);const personal=vars.length>0;const unknown=vars.filter(function(v){return varNames().indexOf(v)<0;});
 $('c-count').textContent=body.length?nf.format(body.length)+' / 1,000 תווים · '+seg+' SMS לנמען'+(personal?' (לפני מילוי המשתנים)':''):'';$('c-vars').hidden=$('c-body').readOnly;
 $('c-vars-hint').hidden=!personal;if(personal&&!unknown.length&&n)schedulePreview(r.list[0]);else if(personal)$('c-vars-hint').textContent=unknown.length?'':'התצוגה המקדימה תופיע אחרי שמוסיפים נמען.';
 const optLine=sender?(ME.settings.optout_link_text?optoutLine():''):ME.settings.optout_text;$('c-optout').hidden=!(n>1&&optLine);$('c-optout').textContent='בשליחה לכמה נמענים יתווסף בסוף ההודעה: '+optLine+(sender?' (קישור הסרה אישי לכל נמען)':'');
 $('c-usage').textContent=ME.daily_limit===null?'':'נוצלו '+nf.format(ME.sent_24h)+' מתוך '+nf.format(ME.daily_limit)+' ב-24 השעות האחרונות';
 const problem=!n?'':n>1&&!ME.can_bulk_send?'אין לך הרשאה לשלוח ליותר מנמען אחד':n>ME.settings.max_recipients?'אפשר לשלוח עד '+nf.format(ME.settings.max_recipients)+' נמענים בכל פעם':ME.daily_limit!==null&&ME.sent_24h+n>ME.daily_limit?'השליחה תחרוג מהמגבלה היומית שלך':sender&&n>1&&!(ME.settings.optout_link_text&&ME.settings.link_base)?'כדי לשלוח בשם שולח לכמה נמענים, מנהל צריך להגדיר טקסט קישור הסרה בהגדרות':body.length>1000?'ההודעה ארוכה מדי':unknown.length?'משתנה לא מוכר: {'+unknown.join('}, {')+'}':'';
 const at=laterAt();const timeProblem=$('c-later').checked&&(!at||at<Date.now()+60000)?'יש לבחור מועד עתידי לשליחה':'';
 const ready=n>0&&$('c-body').value.trim().length>0&&!problem&&!timeProblem;
 $('c-total').textContent=problem||(ready?'סה״כ כ-'+nf.format(seg*n)+' SMS':'');$('c-total').className='hint'+(problem?' bad':'');
 if(timeProblem&&!problem){$('c-total').textContent=timeProblem;$('c-total').className='hint bad';}
 $('c-send').disabled=!ready||C.sending;if(!C.sending)$('c-send-text').textContent=C.confirm?(at&&$('c-later').checked?'אישור תזמון ל-'+shortFmt.format(at)+' · '+nf.format(n)+(n===1?' נמען':' נמענים'):'אישור שליחה ל-'+nf.format(n)+(n===1?' נמען':' נמענים')):'המשך';}
// Scheduled send: the date and time are Israel time.
function laterAt(){if(!$('c-later').checked)return null;const d=$('c-later-date').value,t=$('c-later-time').value;return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d)&&/^[0-9]{2}:[0-9]{2}$/.test(t)?israelTime(d,t):null;}
function edited(){C.confirm=false;C.batches=null;updateCompose();}
function composeError(text){$('c-error').hidden=false;$('c-error').textContent=text;}
function pickColumn(){const pc=phoneColumn(C.rows);const sel=$('c-column');sel.replaceChildren();
 for(let c=0;c<pc.width;c++){const o=el('option','',(pc.header&&C.rows[0][c]?C.rows[0][c]:'עמודה '+(c+1))+(pc.scores[c]?' ('+pc.scores[c]+')':''));o.value=String(c);sel.append(o);}
 sel.value=String(pc.best);applyColumn();}
function applyColumn(){const c=Number($('c-column').value);const first=String(C.rows[0][c]||'');const header=C.rows.length>1&&/[A-Za-z֐-׿]/.test(first)&&!normalize(first);
 C.imported=[];for(let i=header?1:0;i<C.rows.length;i++){const v=String(C.rows[i][c]||'').trim();if(v)C.imported.push({row:i+1,value:v});}
 $('c-import').hidden=false;$('c-import-info').textContent=C.file+' · '+nf.format(C.imported.length)+' שורות';edited();}
$('c-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;$('c-error').hidden=true;
 if(f.size>5242880){composeError('הקובץ גדול מדי (עד 5MB)');return;}
 try{const r=await readRows(f);if(!r.length)throw new Error('הקובץ ריק');C.rows=r;C.file=f.name;pickColumn();}catch(e){composeError('לא ניתן לקרוא את הקובץ: '+(e.message||e));}});
$('c-column').addEventListener('change',applyColumn);
$('c-invalid-more').addEventListener('click',function(){const r=recipients();showReport('מספרים שלא יישלחו',plural(r.list.length,'נמען תקין אחד','נמענים תקינים')+' · '+plural(r.invalid.length,'ערך אחד לא יישלח','ערכים לא יישלחו'),r.invalid);});
$('c-import-clear').addEventListener('click',function(){C.rows=null;C.imported=[];$('c-import').hidden=true;edited();});
$('c-save-list').addEventListener('click',function(){const r=recipients();if(!r.list.length){composeError('אין נמענים לשמירה');return;}$('compose').close();editList(null,r.list);});
for(const id of ['c-to','c-body'])$(id).addEventListener('input',edited);
$('c-from').addEventListener('change',function(){applySender();edited();});
$('c-track').addEventListener('change',edited);
$('c-sender').addEventListener('change',function(){applySender();edited();});
$('c-later').addEventListener('change',function(){$('c-later-row').hidden=!this.checked;edited();});
for(const id of ['c-later-date','c-later-time'])$(id).addEventListener('change',edited);
$('c-flow').addEventListener('change',function(){applyComposeFlow();edited();});
for(const id of ['c-close','c-cancel'])$(id).addEventListener('click',function(){$('compose').close();});
// A test sends the message exactly as recipients would get it (including opt-out text for a multi-recipient send) to one number.
$('c-test-send').addEventListener('click',async function(){const n=normalize($('c-test').value);$('c-error').hidden=true;if(!n){composeError('מספר הבדיקה אינו תקין');return;}if(!$('c-body').value.trim()){composeError('יש לכתוב הודעה לפני שליחת בדיקה');return;}
 const b=this;b.disabled=true;
 try{if($('c-test-save').checked&&n!==ME.test_number){await post('/api/me/prefs',{test_number:n});ME.test_number=n;$('c-test-save').checked=false;}
  const d=await post('/api/send',{id:crypto.randomUUID(),test:true,bulk_preview:recipients().list.length>1,system_number:$('c-from').value,recipients:[n],body:$('c-body').value,track_links:tracking(),sender_id:senderChoice()?senderChoice().id:null});
  if(d.status==='rejected')composeError('הספק דחה את הודעת הבדיקה'+(d.error?': '+d.error:''));else toast(d.status==='accepted'?'הודעת הבדיקה נשלחה ל-'+local(n):'הודעת הבדיקה הועברה לספק, התוצאה לא ידועה');
  loadMe().then(updateCompose).catch(function(){});tick();}
 catch(err){composeError(message(err));}finally{b.disabled=false;}});
$('c-form').addEventListener('submit',async function(e){e.preventDefault();if(C.sending)return;const r=recipients();if(!r.list.length||$('c-send').disabled)return;
 if(!C.confirm){C.confirm=true;updateCompose();return;}
 C.sending=true;$('c-send').disabled=true;$('c-send-text').textContent='שולח…';$('c-error').hidden=true;
 // Personalized and tracked messages go in batches of 40, each with its own send ID kept across retries, so retrying after a
 // failure sends only the batches that did not go out. Other messages go in one request, as before.
 const body=$('c-body').value;const flow=$('c-flow-row').hidden?'':$('c-flow').value;const stop=!flow&&!$('c-flow-row').hidden&&$('c-stop-bot').checked;
 const personal=usedVars(flow?((ME.flows||[]).find(function(f){return String(f.id)===flow;})||{first:''}).first:body).length>0;const at=laterAt();const track=tracking();const from=senderChoice();const senderId=from?from.id:null;
 if(at){try{const d=await post('/api/send',{id:C.id,system_number:$('c-from').value,recipients:r.list,body:body,flow_id:flow?Number(flow):null,stop_bot:stop,track_links:track,sender_id:senderId,send_at:at});
   $('compose').close();toast(d.duplicate?'השליחה הזו כבר תוזמנה':'השליחה תוזמנה ל-'+shortFmt.format(d.send_at)+' · '+plural(d.recipients,'נמען אחד','נמענים'));}
  catch(err){composeError(message(err));}finally{C.sending=false;C.confirm=false;updateCompose();}return;}
 if(!C.batches){const size=(personal||track||(from&&r.list.length>1))&&!ME.settings.micropay_listjson?PERSONAL_BATCH:r.list.length;C.batches=[];for(let i=0;i<r.list.length;i+=size)C.batches.push({id:C.batches.length?crypto.randomUUID():C.id,list:r.list.slice(i,i+size),done:false});}
 const total={sent:0,accepted:0,rejected:0,unknown:0,opted:0,duplicate:false};
 try{for(let i=0;i<C.batches.length;i++){const b=C.batches[i];if(b.done)continue;if(C.batches.length>1)$('c-send-text').textContent='שולח '+nf.format(i+1)+' מתוך '+nf.format(C.batches.length)+'…';
   const d=await post('/api/send',{id:b.id,system_number:$('c-from').value,recipients:b.list,body:body,flow_id:flow?Number(flow):null,stop_bot:stop,track_links:track,sender_id:senderId,bulk:r.list.length>1,batch_of:C.batches.length>1?C.batches[0].id:null});
   if(d.status==='rejected'&&!d.duplicate){b.id=crypto.randomUUID();if(i===0)C.id=b.id;throw new Error('הספק דחה את השליחה'+(d.error?': '+d.error:'')+(total.sent?' ('+nf.format(total.sent)+' נמענים כבר קיבלו את ההודעה; שליחה חוזרת תמשיך מהמקום שנעצר)':''));}
   b.done=true;total.sent+=d.sent;total.duplicate=total.duplicate||!!d.duplicate;if(d.skipped)total.opted+=d.skipped.opted_out||0;
   if(d.counts){total.accepted+=d.counts.accepted;total.rejected+=d.counts.rejected;total.unknown+=d.counts.unknown;}else total[d.status==='accepted'?'accepted':'unknown']+=d.sent;}
  $('compose').close();
  toast(total.duplicate&&C.batches.length===1?'השליחה הזו כבר בוצעה':(total.accepted?'נשלח ל-'+nf.format(total.accepted)+(total.accepted===1?' נמען':' נמענים'):'')+(total.unknown?(total.accepted?' · ':'')+nf.format(total.unknown)+' בתוצאה לא ידועה, בדקו בטבלה לפני שליחה חוזרת':'')+(total.rejected?' · '+nf.format(total.rejected)+' נדחו':'')+(total.opted?' · '+nf.format(total.opted)+' ברשימת ההסרה דולגו':''));
  loadMe().catch(function(){});tick();}
 catch(err){composeError(message(err));loadMe().catch(function(){});tick();}
 finally{C.sending=false;C.confirm=false;updateCompose();}});
$('new').addEventListener('click',function(){openCompose();});

// Scheduled sends: the user's own (admins see everyone's). Waiting sends can be moved or cancelled.
const SCH_STATUS={scheduled:'ממתינה',sent:'נשלחה',failed:'נכשלה',cancelled:'בוטלה'};
async function openScheduled(){let d;try{d=await get('/api/scheduled');}catch(e){toast(message(e));return;}const body=$('sch-rows');body.replaceChildren();
 for(const s of d.scheduled){const tr=el('tr');const when=el('td');when.append(el('span','',shortFmt.format(s.send_at)));if(ME.role==='admin'&&s.email!==ME.email)when.append(el('span','sub-line',s.email));
  const msg=el('td');msg.append(el('div','sch-body',(s.flow?'[בוט: '+s.flow+'] ':'')+s.body));msg.title=s.body;if(s.track_links)msg.append(el('span','tag','מעקב קישורים'));if(s.sender)msg.append(el('span','tag','בשם '+(/^[+][0-9]+$/.test(s.sender)?local(s.sender):s.sender)));
  const st=el('td');const r=s.result;let label=SCH_STATUS[s.status];if(s.status==='scheduled'&&s.progress)label='בשליחה '+nf.format(s.progress)+'/'+nf.format(s.recipients);st.append(el('span','tag'+(s.status==='failed'?' off':s.status==='sent'?' accent':''),label));
  if(r)st.append(el('span','sub-line',(r.accepted?nf.format(r.accepted)+' נשלחו':'')+(r.unknown?' · '+nf.format(r.unknown)+' לא ידוע':'')+(r.rejected?' · '+nf.format(r.rejected)+' נדחו':'')+(r.opted_out?' · '+nf.format(r.opted_out)+' בהסרה':'')+(r.error?' · '+r.error:'')));
  const act=el('td');if(s.status==='scheduled'&&!s.progress){const move=el('button','ghost','שינוי מועד');move.type='button';move.addEventListener('click',function(){rescheduleRow(act,s);});
   const cancel=el('button','ghost danger','ביטול');cancel.type='button';cancel.addEventListener('click',async function(){if(!await confirmAction('ביטול שליחה מתוזמנת','לבטל את השליחה ל-'+plural(s.recipients,'נמען אחד','נמענים')+' שתוזמנה ל-'+shortFmt.format(s.send_at)+'?','ביטול השליחה'))return;
    try{await post('/api/scheduled/cancel',{id:s.id});toast('השליחה בוטלה');openScheduled();}catch(e){toast(message(e));}});act.append(move,cancel);}
  tr.append(when,cell2(labels.get(s.system_number)||local(s.system_number)),cell2(nf.format(s.recipients)),msg,st,act);body.append(tr);}
 if(!d.scheduled.length){const tr=el('tr');const td=el('td','dash','אין שליחות מתוזמנות');td.colSpan=6;tr.append(td);body.append(tr);}
 $('sch-note').textContent='נשלחות עד דקה אחרי המועד.';if(!$('sch-dlg').open)$('sch-dlg').showModal();}
function cell2(t){return el('td','',t);}
function rescheduleRow(cellEl,s){const box=el('span','sch-edit');const d=el('input'),t=el('input');d.type='date';t.type='time';d.value=ymd(s.send_at);const z=zoned(s.send_at);t.value=pad(z.hour)+':'+pad(z.minute);
 const ok=el('button','ghost','שמירה');ok.type='button';ok.addEventListener('click',async function(){if(!d.value||!t.value)return;try{await post('/api/scheduled/reschedule',{id:s.id,send_at:israelTime(d.value,t.value)});toast('המועד עודכן');openScheduled();}catch(e){toast(message(e));}});
 box.append(d,t,ok);cellEl.replaceChildren(box);}
$('sched-btn').addEventListener('click',openScheduled);
for(const id of ['sch-close','sch-done'])$(id).addEventListener('click',function(){$('sch-dlg').close();});

title();
(async function(){try{await loadMe();noNumbers=!ME.numbers.length;for(const n of ME.numbers)labels.set(n.number,n.label);
  $('restricted-note').hidden=!ME.numbers.some(function(n){return n.restricted;});buildColumns();readUrl();$('q').value=state.q;const canSendAny=senders().length>0;$('new').hidden=!canSendAny;$('lists-btn').hidden=!canSendAny;$('sched-btn').hidden=!canSendAny;}
 catch(e){fail(e,true);return;}
 await load();schedule();})();
`;
export function page(nonce:string):string { return shell(nonce,'הודעות SMS',css,body,LINKS_JS+script,'app'); }

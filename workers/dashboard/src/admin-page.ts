import {header,shell,svg} from './ui';
const css = String.raw`
.tabs{display:flex;gap:2px;overflow-x:auto;border-bottom:1px solid var(--line)}
.tabs button{padding:9px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--ink2);font-weight:550;white-space:nowrap;cursor:pointer}
.tabs button:hover{color:var(--ink)}
.tabs button[aria-selected=true]{border-bottom-color:var(--accent);color:var(--ink)}
.list{min-width:760px}
.list td{vertical-align:middle}
.sub-line{display:block;font-size:12.5px;color:var(--muted)}
.perm{display:grid;gap:4px;max-height:240px;overflow:auto;padding:6px 10px;border:1px solid var(--line);border-radius:9px}
.perm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0}
.perm-row select{width:auto;min-width:150px;min-height:32px}
.settings{display:grid;gap:16px;max-width:760px;padding:18px 20px}
.optout-add{display:flex;flex:1 1 320px;gap:8px;align-items:center}
.optout-add input{flex:1;min-width:0}
.more-row{display:flex;justify-content:center;padding:14px}
.field-rows{display:grid;gap:6px}
.field-row{display:flex;align-items:center;gap:8px}
.field-row input{flex:1;min-width:0}
.online{color:var(--ink2);font-size:12.5px;white-space:nowrap}
`;
const userDialog = String.raw`
<dialog id="user-dlg" aria-labelledby="ud-title"><form class="dialog-body" id="ud-form" novalidate>
 <div class="dialog-head"><h2 id="ud-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="grid2"><label class="fld"><span>אימייל</span><input type="email" id="ud-email" class="phone" required maxlength="254" autocomplete="off"></label><label class="fld"><span>שם</span><input id="ud-name" maxlength="80"></label></div>
 <div class="grid2"><label class="fld"><span>תפקיד</span><select id="ud-role"><option value="user">משתמש</option><option value="admin">מנהל</option></select></label><label class="fld"><span>מגבלת נמענים ל-24 שעות</span><input type="number" id="ud-limit" min="0" max="100000" step="1"></label></div>
 <label class="fld"><span>מספר לבדיקה</span><input id="ud-test" class="phone" dir="ltr" maxlength="20" placeholder="לא הוגדר"></label>
 <div class="row"><label class="check"><input type="checkbox" id="ud-active">משתמש פעיל</label><label class="check"><input type="checkbox" id="ud-bulk">שליחה לכמה נמענים וייבוא מקובץ</label><label class="check"><input type="checkbox" id="ud-contacts">עריכת פרטי לקוחות</label></div>
 <div class="fld"><span class="label">גישה למספרים</span><p class="hint" id="ud-admin-note" hidden>למנהלים יש גישה מלאה לכל המספרים, ללא מגבלת שליחה.</p><div class="perm" id="ud-perms"></div></div>
 <p class="hint">המשתמש נכנס עם קוד חד-פעמי שנשלח לכתובת האימייל שלו.</p>
 <div class="banner" id="ud-error" role="alert" hidden></div>
 <div class="dialog-foot"><button type="button" class="ghost danger" id="ud-delete">מחיקת המשתמש</button><button type="button" class="ghost danger" id="ud-disconnect">ניתוק החיבור</button><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="ud-save">שמירה</button></div>
</form></dialog>
<dialog id="num-dlg" aria-labelledby="nd-title"><form class="dialog-body" id="nd-form" novalidate>
 <div class="dialog-head"><h2 id="nd-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="grid2"><label class="fld"><span>מספר</span><input id="nd-number" class="phone" required maxlength="20" placeholder="05X-XXX-XXXX"></label><label class="fld"><span>שם תצוגה</span><input id="nd-label" required maxlength="40"></label></div>
 <label class="check"><input type="checkbox" id="nd-active">מספר פעיל</label>
 <p class="hint" id="nd-note"></p>
 <div class="banner" id="nd-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn">שמירה</button></div>
</form></dialog>
<dialog id="ct-dlg" aria-labelledby="ct-title"><form class="dialog-body" id="ct-form" novalidate>
 <div class="dialog-head"><h2 id="ct-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <label class="fld"><span>מספר טלפון</span><input id="ct-number" class="phone" dir="ltr" required maxlength="20" placeholder="05X-XXX-XXXX"></label>
 <div class="grid2" id="ct-fields"></div>
 <div class="banner" id="ct-error" role="alert" hidden></div>
 <div class="dialog-foot"><button type="button" class="ghost danger" id="ct-delete">מחיקת איש הקשר</button><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn">שמירה</button></div>
</form></dialog>
<dialog id="ci-dlg" aria-labelledby="ci-title"><form class="dialog-body" id="ci-form" novalidate>
 <div class="dialog-head"><h2 id="ci-title">ייבוא אנשי קשר</h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <p class="hint" id="ci-info"></p>
 <label class="fld"><span>עמודת הטלפון</span><select id="ci-phone"></select></label>
 <div class="grid2" id="ci-fields"></div>
 <label class="check"><input type="checkbox" id="ci-header">השורה הראשונה בקובץ היא כותרות</label>
 <div class="fld"><span class="label">אנשי קשר שכבר קיימים</span><div class="seg" role="group" aria-label="אנשי קשר קיימים"><button type="button" data-mode="update" aria-pressed="true">לעדכן את השדות מהקובץ</button><button type="button" data-mode="skip" aria-pressed="false">לדלג עליהם</button></div></div>
 <div class="bar" id="ci-bar" hidden><div id="ci-progress"></div></div>
 <div class="banner" id="ci-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="hint" id="ci-status"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="ci-go">ייבוא</button></div>
</form></dialog>
`;
const body = header('admin',false) + String.raw`
<main class="wrap">
 <nav class="tabs" role="tablist" aria-label="ניהול"><button type="button" role="tab" data-tab="users">משתמשים</button><button type="button" role="tab" data-tab="numbers">מספרים</button><button type="button" role="tab" data-tab="contacts">אנשי קשר</button><button type="button" role="tab" data-tab="optouts">רשימת הסרה</button><button type="button" role="tab" data-tab="settings">הגדרות</button><button type="button" role="tab" data-tab="audit">יומן פעולות</button></nav>
 <div class="banner panel" id="error" role="alert" hidden><span id="error-text"></span></div>
 <section class="panel" data-panel="users" hidden>
  <div class="toolbar"><label class="field search">`+svg('search')+String.raw`<input id="u-q" type="search" placeholder="חיפוש לפי שם או אימייל" aria-label="חיפוש משתמשים"></label><button type="button" class="btn end" id="u-add">`+svg('plus')+String.raw`הוספת משתמש</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>משתמש</span></th><th><span>תפקיד</span></th><th><span>מספרים</span></th><th><span>שליחה מרובה</span></th><th><span>נשלחו ב-24 שעות</span></th><th><span>כניסה אחרונה</span></th><th><span>סטטוס</span></th></tr></thead><tbody id="u-rows"></tbody></table></div>
 </section>
 <section class="panel" data-panel="numbers" hidden>
  <div class="toolbar"><span class="hint">מספר חדש צריך גם שירות טקסט דינמי במיקרופיי שמפנה לכתובת הקליטה.</span><button type="button" class="btn end" id="n-add">`+svg('plus')+String.raw`הוספת מספר</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>שם תצוגה</span></th><th><span>מספר</span></th><th><span>סטטוס</span></th><th><span>משתמשים משויכים</span></th></tr></thead><tbody id="n-rows"></tbody></table></div>
 </section>
 <section class="panel" data-panel="contacts" hidden>
  <div class="toolbar"><label class="field search">`+svg('search')+String.raw`<input id="c-q" type="search" placeholder="חיפוש לפי מספר או פרטים" aria-label="חיפוש אנשי קשר"></label><label class="ghost end" id="c-import-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="c-file" accept=".csv,.txt,.xlsx" hidden></label><button type="button" class="btn" id="c-add">`+svg('plus')+String.raw`הוספת איש קשר</button></div>
  <div class="table-wrap"><table class="list"><thead><tr id="c-head"></tr></thead><tbody id="c-rows"></tbody></table></div>
  <div class="foot"><span id="c-count"></span><span>הפרטים מוצגים לצד מספר הלקוח בטבלת ההודעות ובייצוא. את השדות מגדירים בלשונית ההגדרות.</span></div>
 </section>
 <section class="panel" data-panel="optouts" hidden>
  <form class="toolbar" id="o-form"><label class="field search">`+svg('search')+String.raw`<input id="o-q" type="search" placeholder="חיפוש מספר" aria-label="חיפוש ברשימת ההסרה"></label><div class="optout-add"><input id="o-add" class="field" placeholder="הוספת מספרים, מופרדים בפסיק" aria-label="מספרים להוספה"><button type="submit" class="btn">הוספה</button></div></form>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>מספר</span></th><th><span>מקור</span></th><th><span>נוסף</span></th><th><span>על ידי</span></th><th><span></span></th></tr></thead><tbody id="o-rows"></tbody></table></div>
  <div class="foot"><span id="o-count"></span><span>מספרים ברשימה מדולגים בכל שליחה. לקוח שעונה במילת הסרה נוסף אוטומטית.</span></div>
 </section>
 <section class="panel" data-panel="settings" hidden>
  <form class="settings" id="s-form" novalidate>
   <div class="grid2"><label class="fld"><span>שם הארגון</span><input id="s-org" maxlength="60" placeholder="מוצג בכותרת"></label><label class="fld"><span>מרווח שורות ברירת מחדל</span><select id="s-density"><option value="wide">רחב</option><option value="narrow">צר</option><option value="dense">צפוף</option></select></label></div>
   <div class="grid2"><label class="fld"><span>עדכון חי כל (שניות)</span><input type="number" id="s-refresh" min="3" max="60"></label><label class="fld"><span>מקסימום נמענים בשליחה אחת</span><input type="number" id="s-max" min="1" max="5000"></label></div>
   <div class="grid2"><label class="fld"><span>מגבלת נמענים ל-24 שעות (ברירת מחדל)</span><input type="number" id="s-daily" min="0" max="100000"></label><label class="fld"><span>מילות הסרה</span><input id="s-keywords" placeholder="הסר, הסרה, STOP"></label></div>
   <label class="fld"><span>טקסט הסרה שמתווסף לשליחה לכמה נמענים</span><input id="s-optout" maxlength="120" placeholder="לדוגמה: להסרה השיבו הסר"></label>
   <label class="check"><input type="checkbox" id="s-intl">לאפשר שליחה למספרים מחוץ לישראל</label>
   <div class="fld"><span class="label">שדות אנשי קשר</span><div class="field-rows" id="s-fields"></div><div class="row"><button type="button" class="ghost" id="s-field-add">`+svg('plus')+String.raw`הוספת שדה</button><span class="hint">הסרת שדה מסתירה אותו בלבד; הנתונים שנשמרו בו לא נמחקים.</span></div></div>
   <div class="banner" id="s-error" role="alert" hidden></div>
   <div class="row"><button type="submit" class="btn">שמירת ההגדרות</button></div>
  </form>
 </section>
 <section class="panel" data-panel="audit" hidden>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>זמן</span></th><th><span>משתמש</span></th><th><span>פעולה</span></th><th><span>יעד</span></th><th><span>פרטים</span></th></tr></thead><tbody id="a-rows"></tbody></table>
  <div class="more-row" id="a-more-row" hidden><button type="button" class="ghost" id="a-more">טעינת רשומות נוספות</button></div></div>
 </section>
</main>
`+userDialog;
const script = String.raw`
const TABS=['users','numbers','contacts','optouts','settings','audit'];
const ACTIONS={'user.create':'משתמש נוסף','user.update':'משתמש עודכן','user.delete':'משתמש נמחק','number.create':'מספר נוסף','number.update':'מספר עודכן','settings.update':'ההגדרות עודכנו','optout.add':'נוספו לרשימת ההסרה','optout.remove':'הוסר מרשימת ההסרה','send':'שליחת הודעה','export':'ייצוא הודעות','user.disconnect':'ניתוק משתמש','user.logout':'התנתקות','contact.save':'איש קשר נשמר','contact.delete':'איש קשר נמחק','contacts.import':'ייבוא אנשי קשר','list.save':'רשימת תפוצה נשמרה','list.delete':'רשימת תפוצה נמחקה'};
const SEND_STATUS={accepted:'התקבלה',rejected:'נדחתה',unknown:'לא ידוע',sending:'בשליחה'};
let USERS=[],NUMBERS=[],SETTINGS=null,OPTOUTS=[],CONTACTS=[],auditBefore=null,importRows=null,importMode='update';
function error(e){$('error').hidden=false;$('error-text').textContent=message(e);}
function dlgError(id,e){$(id).hidden=false;$(id).textContent=message(e);}
function cell(text,cls){return el('td',cls,text);}
function seen(ms){return ms?shortFmt.format(ms):'טרם התחבר';}
function showTab(t){if(!TABS.includes(t))t='users';for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===t));
 for(const p of document.querySelectorAll('[data-panel]'))p.hidden=p.dataset.panel!==t;if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);$('error').hidden=true;
 ({users:loadUsers,numbers:loadNumbers,contacts:loadContacts,optouts:loadOptouts,settings:loadSettings,audit:function(){return loadAudit(true);}})[t]().catch(error);}
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',function(){showTab(b.dataset.tab);});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',function(){b.closest('dialog').close();});
// Connected: seen in the last two minutes and not disconnected since.
function online(u){return u.active&&u.last_seen_at&&Date.now()-u.last_seen_at<120000&&!(u.sessions_revoked_at&&u.sessions_revoked_at>u.last_seen_at);}

async function loadUsers(){const r=await Promise.all([get('/api/admin/users'),get('/api/admin/numbers'),get('/api/admin/settings')]);USERS=r[0].users;NUMBERS=r[1].numbers;SETTINGS=r[2];renderUsers();}
function renderUsers(){const q=$('u-q').value.trim().toLowerCase();const body=$('u-rows');body.replaceChildren();
 for(const u of USERS){if(q&&(u.name+' '+u.email).toLowerCase().indexOf(q)<0)continue;const admin=u.role==='admin';const tr=el('tr','click');tr.tabIndex=0;tr.dataset.email=u.email;
  const who=el('td');who.append(el('span','',u.name||u.email));if(u.name)who.append(el('span','sub-line',u.email));
  const role=el('td');role.append(el('span','tag'+(admin?' accent':''),admin?'מנהל':'משתמש'));
  const sending=u.numbers.filter(function(n){return n.can_send;}).length;
  const limit=admin?'ללא הגבלה':nf.format(u.sent_24h)+' / '+nf.format(u.daily_limit===null?SETTINGS.default_daily_limit:u.daily_limit);
  const status=el('td');status.append(el('span','tag'+(u.active?'':' off'),u.active?'פעיל':'מושבת'));if(online(u)){const o=el('span','online');o.append(el('span','dot-on'),'מחובר עכשיו');status.append(' ',o);}
  tr.append(who,role,cell(admin?'כל המספרים':u.numbers.length?nf.format(u.numbers.length)+(sending?' · שליחה ב-'+nf.format(sending):' · צפייה בלבד'):'אין גישה',admin||u.numbers.length?'':'muted'),cell(admin||u.can_bulk_send?'כן':'לא'),cell(limit),cell(seen(u.last_seen_at),'muted'),status);body.append(tr);}
 if(!body.children.length){const tr=el('tr');const td=cell(q?'לא נמצאו משתמשים':'אין משתמשים','muted');td.colSpan=7;tr.append(td);body.append(tr);}}
function openUser(email){const u=email?USERS.find(function(x){return x.email===email;}):null;$('ud-title').textContent=u?'עריכת משתמש':'משתמש חדש';
 $('ud-email').value=u?u.email:'';$('ud-email').readOnly=!!u;$('ud-name').value=u?u.name:'';$('ud-role').value=u?u.role:'user';$('ud-active').checked=u?!!u.active:true;$('ud-bulk').checked=u?!!u.can_bulk_send:false;$('ud-contacts').checked=u?!!u.can_edit_contacts:true;
 $('ud-test').value=u&&u.test_number?local(u.test_number):'';$('ud-limit').value=u&&u.daily_limit!==null?String(u.daily_limit):'';$('ud-limit').placeholder='ברירת מחדל: '+nf.format(SETTINGS.default_daily_limit);
 const perms=$('ud-perms');perms.replaceChildren();
 for(const n of NUMBERS){const current=u&&u.numbers.find(function(x){return x.number===n.number;});const row=el('label','perm-row');const name=el('span');name.append(n.label+' · ',el('span','phone',local(n.number)));if(!n.active)name.append(el('span','muted',' (מושבת)'));
  const sel=el('select');sel.dataset.number=n.number;for(const o of [['','ללא גישה'],['view','צפייה'],['send','צפייה ושליחה']]){const opt=el('option','',o[1]);opt.value=o[0];sel.append(opt);}sel.value=current?(current.can_send?'send':'view'):'';row.append(name,sel);perms.append(row);}
 if(!NUMBERS.length)perms.append(el('p','hint','עדיין לא הוגדרו מספרים.'));
 $('ud-delete').hidden=$('ud-disconnect').hidden=!u||u.email===ME.email;$('ud-error').hidden=true;roleChanged();$('user-dlg').showModal();(u?$('ud-name'):$('ud-email')).focus();}
function roleChanged(){const admin=$('ud-role').value==='admin';$('ud-admin-note').hidden=!admin;$('ud-perms').hidden=admin;$('ud-bulk').disabled=admin;$('ud-contacts').disabled=admin;$('ud-limit').disabled=admin;}
$('ud-role').addEventListener('change',roleChanged);
$('u-q').addEventListener('input',renderUsers);
$('u-add').addEventListener('click',function(){openUser(null);});
$('u-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-email]');if(tr)openUser(tr.dataset.email);});
$('u-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.email){e.preventDefault();openUser(e.target.dataset.email);}});
$('ud-form').addEventListener('submit',async function(e){e.preventDefault();const editing=$('ud-email').readOnly;const limit=$('ud-limit').value.trim();
 if(limit!==''&&!/^[0-9]+$/.test(limit)){dlgError('ud-error',new Error('מגבלת הנמענים צריכה להיות מספר שלם'));return;}
 const test=$('ud-test').value.trim();if(test&&!normalize(test)){dlgError('ud-error',new Error('מספר הבדיקה אינו תקין'));return;}
 const numbers=[];for(const s of $('ud-perms').querySelectorAll('select'))if(s.value)numbers.push({number:s.dataset.number,can_send:s.value==='send'});
 $('ud-save').disabled=true;
 try{await post('/api/admin/users/save',{create:!editing,email:$('ud-email').value.trim(),name:$('ud-name').value,role:$('ud-role').value,active:$('ud-active').checked,can_bulk_send:$('ud-bulk').checked,can_edit_contacts:$('ud-contacts').checked,daily_limit:limit===''?null:Number(limit),test_number:test?normalize(test):null,numbers:numbers});
  $('user-dlg').close();toast(editing?'המשתמש עודכן':'המשתמש נוסף');await loadUsers();}
 catch(err){dlgError('ud-error',err);}finally{$('ud-save').disabled=false;}});
$('ud-delete').addEventListener('click',async function(){const email=$('ud-email').value;$('user-dlg').close();
 if(!await confirmAction('מחיקת משתמש','למחוק את '+email+'? הגישה שלו תיחסם מיד. הודעות שהוא שלח יישארו בטבלה.','מחיקה'))return;
 try{await post('/api/admin/users/delete',{email:email});toast('המשתמש נמחק');await loadUsers();}catch(err){error(err);}});
$('ud-disconnect').addEventListener('click',async function(){const email=$('ud-email').value;$('user-dlg').close();
 const a=await confirmAction('ניתוק משתמש','לנתק את '+email+'? החיבור הנוכחי שלו יסתיים מיד והוא יצטרך להתחבר מחדש עם קוד חד-פעמי.','ניתוק','וגם להשבית את המשתמש, כדי שלא יוכל להתחבר שוב');if(!a)return;
 try{await post('/api/admin/users/disconnect',{email:email,disable:a.checked});toast(a.checked?'המשתמש נותק והושבת':'המשתמש נותק');await loadUsers();}catch(err){error(err);}});

async function loadNumbers(){NUMBERS=(await get('/api/admin/numbers')).numbers;const body=$('n-rows');body.replaceChildren();
 for(const n of NUMBERS){const tr=el('tr','click');tr.tabIndex=0;tr.dataset.number=n.number;const status=el('td');status.append(el('span','tag'+(n.active?'':' off'),n.active?'פעיל':'מושבת'));
  tr.append(cell(n.label),cell(local(n.number),'phone'),status,cell(nf.format(n.users)));body.append(tr);}
 if(!NUMBERS.length){const tr=el('tr');const td=cell('עדיין לא הוגדרו מספרים','muted');td.colSpan=4;tr.append(td);body.append(tr);}}
function openNumber(number){const n=number?NUMBERS.find(function(x){return x.number===number;}):null;$('nd-title').textContent=n?'עריכת מספר':'מספר חדש';
 $('nd-number').value=n?local(n.number):'';$('nd-number').readOnly=!!n;$('nd-label').value=n?n.label:'';$('nd-active').checked=n?!!n.active:true;$('nd-error').hidden=true;activeNote();$('num-dlg').showModal();(n?$('nd-label'):$('nd-number')).focus();}
function activeNote(){$('nd-note').textContent=$('nd-active').checked?'':'מספר מושבת מוסתר מכל המשתמשים, והודעות נכנסות אליו נדחות. מיקרופיי עשוי לשלוח ללקוח הודעת שגיאה.';$('nd-note').className='hint'+($('nd-active').checked?'':' bad');}
$('nd-active').addEventListener('change',activeNote);
$('n-add').addEventListener('click',function(){openNumber(null);});
$('n-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-number]');if(tr)openNumber(tr.dataset.number);});
$('n-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.number){e.preventDefault();openNumber(e.target.dataset.number);}});
$('nd-form').addEventListener('submit',async function(e){e.preventDefault();const editing=$('nd-number').readOnly;const number=normalize($('nd-number').value);
 if(!number){dlgError('nd-error',new Error('מספר הטלפון אינו תקין'));return;}
 try{await post('/api/admin/numbers/save',{create:!editing,number:number,label:$('nd-label').value,active:$('nd-active').checked});$('num-dlg').close();toast(editing?'המספר עודכן':'המספר נוסף');await loadNumbers();}
 catch(err){dlgError('nd-error',err);}});

async function loadContacts(){const r=await Promise.all([get('/api/admin/contacts?q='+encodeURIComponent($('c-q').value.trim())),SETTINGS?Promise.resolve(SETTINGS):get('/api/admin/settings')]);CONTACTS=r[0].contacts;SETTINGS=r[1];renderContacts(r[0].total);}
function renderContacts(totalCount){const head=$('c-head');head.replaceChildren();const fields=SETTINGS.contact_fields;for(const label of ['מספר'].concat(fields.map(function(f){return f.label;}),['עודכן'])){const th=el('th');th.append(el('span','',label));head.append(th);}
 const body=$('c-rows');body.replaceChildren();for(const c of CONTACTS){const tr=el('tr','click');tr.tabIndex=0;tr.dataset.number=c.number;tr.append(cell(local(c.number),'phone'));for(const f of fields)tr.append(cell(c.data[f.id]||'—',c.data[f.id]?'':'muted'));tr.append(cell(shortFmt.format(c.updated_at),'muted'));body.append(tr);}
 if(!CONTACTS.length){const tr=el('tr');const td=cell($('c-q').value.trim()?'לא נמצאו אנשי קשר':'עדיין אין אנשי קשר. אפשר להוסיף ידנית או לייבא מקובץ.','muted');td.colSpan=fields.length+2;tr.append(td);body.append(tr);}
 $('c-count').textContent=nf.format(totalCount)+' אנשי קשר'+(CONTACTS.length<totalCount?' · מוצגים '+nf.format(CONTACTS.length):'');}
let contactTimer=0;$('c-q').addEventListener('input',function(){clearTimeout(contactTimer);contactTimer=setTimeout(function(){loadContacts().catch(error);},300);});
function openContact(number){const c=number?CONTACTS.find(function(x){return x.number===number;}):null;$('ct-title').textContent=c?'עריכת איש קשר':'איש קשר חדש';$('ct-number').value=c?local(c.number):'';$('ct-number').readOnly=!!c;
 const box=$('ct-fields');box.replaceChildren();for(const f of SETTINGS.contact_fields){const l=el('label','fld');const inp=el('input');inp.maxLength=200;inp.dataset.field=f.id;inp.value=c&&c.data[f.id]||'';l.append(el('span','',f.label),inp);box.append(l);}
 $('ct-delete').hidden=!c;$('ct-error').hidden=true;$('ct-dlg').showModal();(c?box.querySelector('input'):$('ct-number')).focus();}
$('c-add').addEventListener('click',function(){openContact(null);});
$('c-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-number]');if(tr)openContact(tr.dataset.number);});
$('c-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.number){e.preventDefault();openContact(e.target.dataset.number);}});
$('ct-form').addEventListener('submit',async function(e){e.preventDefault();const number=normalize($('ct-number').value);if(!number){dlgError('ct-error',new Error('מספר הטלפון אינו תקין'));return;}
 const data={};for(const inp of $('ct-fields').querySelectorAll('input'))data[inp.dataset.field]=inp.value;
 try{await post('/api/admin/contacts/save',{number:number,data:data});$('ct-dlg').close();toast('איש הקשר נשמר');await loadContacts();}catch(err){dlgError('ct-error',err);}});
$('ct-delete').addEventListener('click',async function(){const number=normalize($('ct-number').value);$('ct-dlg').close();if(!await confirmAction('מחיקת איש קשר','למחוק את הפרטים של '+local(number)+'? ההודעות עצמן לא יימחקו.','מחיקה'))return;
 try{await post('/api/admin/contacts/delete',{number:number});toast('איש הקשר נמחק');await loadContacts();}catch(err){error(err);}});
// Import: pick the phone column and a file column for each contact field (matched by header name), then upload in batches of 1000.
$('c-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;
 try{if(f.size>10485760)throw new Error('הקובץ גדול מדי (עד 10MB)');const rows=await readRows(f);if(!rows.length)throw new Error('הקובץ ריק');importRows=rows;const pc=phoneColumn(rows);
  const name=function(c){return (pc.header&&rows[0][c]?rows[0][c]:'עמודה '+(c+1));};const fill=function(sel,withNone){sel.replaceChildren();if(withNone){const o=el('option','','לא לייבא');o.value='';sel.append(o);}for(let c=0;c<pc.width;c++){const o=el('option','',name(c));o.value=String(c);sel.append(o);}};
  fill($('ci-phone'),false);$('ci-phone').value=String(pc.best);const box=$('ci-fields');box.replaceChildren();
  for(const fd of SETTINGS.contact_fields){const l=el('label','fld');const sel=el('select');sel.dataset.field=fd.id;fill(sel,true);let match='';if(pc.header)for(let c=0;c<pc.width;c++)if(String(rows[0][c]||'').trim().toLowerCase()===fd.label.toLowerCase())match=String(c);sel.value=match;l.append(el('span','',fd.label),sel);box.append(l);}
  $('ci-header').checked=pc.header;$('ci-info').textContent=f.name+' · '+nf.format(rows.length)+' שורות';$('ci-error').hidden=true;$('ci-bar').hidden=true;$('ci-status').textContent='';$('ci-go').disabled=false;$('ci-dlg').showModal();}
 catch(err){error(err);}});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',function(){importMode=b.dataset.mode;for(const x of document.querySelectorAll('[data-mode]'))x.setAttribute('aria-pressed',String(x===b));});
$('ci-form').addEventListener('submit',async function(e){e.preventDefault();if(!importRows)return;const phoneCol=Number($('ci-phone').value);const map=Array.from($('ci-fields').querySelectorAll('select')).filter(function(s){return s.value!=='';}).map(function(s){return [s.dataset.field,Number(s.value)];});
 const rows=importRows.slice($('ci-header').checked?1:0).filter(function(r){return String(r[phoneCol]||'').trim();}).map(function(r){const data={};for(const m of map)data[m[0]]=r[m[1]]||'';return {number:r[phoneCol],data:data};});
 if(!rows.length){dlgError('ci-error',new Error('לא נמצאו שורות עם מספר טלפון'));return;}
 $('ci-go').disabled=true;$('ci-bar').hidden=false;let imported=0,invalid=0;
 try{for(let i=0;i<rows.length;i+=1000){const d=await post('/api/admin/contacts/import',{mode:importMode,rows:rows.slice(i,i+1000)});imported+=d.imported;invalid+=d.invalid;$('ci-progress').style.width=Math.min(100,(i+1000)/rows.length*100)+'%';$('ci-status').textContent='יובאו '+nf.format(imported);}
  $('ci-dlg').close();toast(plural(imported,'יובא איש קשר אחד','אנשי קשר יובאו')+(invalid?' · '+plural(invalid,'שורה אחת עם מספר לא תקין','שורות עם מספר לא תקין'):''));await loadContacts();}
 catch(err){dlgError('ci-error',err);}finally{$('ci-go').disabled=false;}});

async function loadOptouts(){OPTOUTS=(await get('/api/admin/optouts')).optouts;renderOptouts();}
function renderOptouts(){const q=$('o-q').value.replace(/[^0-9+]/g,'');const body=$('o-rows');body.replaceChildren();let shown=0;
 for(const o of OPTOUTS){if(q&&o.number.indexOf(q.replace(/^0/,''))<0&&local(o.number).replace(/-/g,'').indexOf(q)<0)continue;if(++shown>500)break;
  const tr=el('tr');const rm=el('button','ghost danger','הסרה');rm.type='button';rm.dataset.number=o.number;const last=el('td');last.append(rm);
  tr.append(cell(local(o.number),'phone'),cell(o.source==='keyword'?'תגובת הסרה':'הוספה ידנית'),cell(shortFmt.format(o.created_at),'muted'),cell(o.created_by||'—','muted'),last);body.append(tr);}
 if(!shown){const tr=el('tr');const td=cell(q?'המספר לא נמצא ברשימה':'הרשימה ריקה','muted');td.colSpan=5;tr.append(td);body.append(tr);}
 $('o-count').textContent=nf.format(OPTOUTS.length)+' מספרים ברשימה';}
$('o-q').addEventListener('input',renderOptouts);
$('o-form').addEventListener('submit',async function(e){e.preventDefault();const numbers=$('o-add').value.split(/[,;\n]+/).map(function(s){return s.trim();}).filter(Boolean);if(!numbers.length)return;
 try{const d=await post('/api/admin/optouts/add',{numbers:numbers});$('o-add').value='';toast('נוספו '+nf.format(d.added)+' מספרים'+(d.invalid?' · '+nf.format(d.invalid)+' לא תקינים':''));await loadOptouts();}catch(err){error(err);}});
$('o-rows').addEventListener('click',async function(e){const b=e.target.closest('button[data-number]');if(!b)return;
 if(!await confirmAction('הסרה מרשימת ההסרה','להסיר את '+local(b.dataset.number)+' מהרשימה? אפשר יהיה לשלוח אליו שוב.','הסרה'))return;
 try{await post('/api/admin/optouts/remove',{number:b.dataset.number});toast('המספר הוסר מהרשימה');await loadOptouts();}catch(err){error(err);}});

function fieldRow(f){const r=el('div','field-row');const inp=el('input','field');inp.maxLength=30;inp.value=f.label;inp.dataset.id=f.id;inp.setAttribute('aria-label','שם השדה');const x=el('button','icon-btn');x.type='button';x.setAttribute('aria-label','הסרת השדה');x.append(icon('trash'));x.addEventListener('click',function(){r.remove();});r.append(inp,x);return r;}
$('s-field-add').addEventListener('click',function(){if($('s-fields').children.length>=10){toast('אפשר להגדיר עד 10 שדות');return;}const r=fieldRow({id:'f'+Date.now().toString(36),label:''});$('s-fields').append(r);r.querySelector('input').focus();});
async function loadSettings(){SETTINGS=await get('/api/admin/settings');$('s-fields').replaceChildren();for(const f of SETTINGS.contact_fields)$('s-fields').append(fieldRow(f));$('s-org').value=SETTINGS.org_name;$('s-density').value=SETTINGS.default_density;$('s-refresh').value=SETTINGS.refresh_seconds;$('s-max').value=SETTINGS.max_recipients;
 $('s-daily').value=SETTINGS.default_daily_limit;$('s-keywords').value=SETTINGS.optout_keywords.join(', ');$('s-optout').value=SETTINGS.optout_text;$('s-intl').checked=SETTINGS.allow_international;$('s-error').hidden=true;}
$('s-form').addEventListener('submit',async function(e){e.preventDefault();$('s-error').hidden=true;const n=function(id){return Number($(id).value);};
 try{SETTINGS=await post('/api/admin/settings',{org_name:$('s-org').value,default_density:$('s-density').value,refresh_seconds:n('s-refresh'),max_recipients:n('s-max'),default_daily_limit:n('s-daily'),optout_keywords:$('s-keywords').value.split(',').map(function(s){return s.trim();}).filter(Boolean),optout_text:$('s-optout').value,allow_international:$('s-intl').checked,contact_fields:Array.from($('s-fields').querySelectorAll('input')).map(function(i){return {id:i.dataset.id,label:i.value.trim()};}).filter(function(f){return f.label;})});
  toast('ההגדרות נשמרו');await loadSettings();$('org').textContent=SETTINGS.org_name||'מצב הגשה אינו אישור מסירה';}
 catch(err){dlgError('s-error',err);}});

function details(action,raw){if(!raw)return '';let d;try{d=JSON.parse(raw);}catch(e){return raw;}
 if(action==='send')return (d.test?'בדיקה · ':'')+nf.format(d.recipients)+' נמענים · '+(SEND_STATUS[d.status]||d.status);
 if(action==='export')return (d.format==='csv'?'CSV':'Excel')+' · '+nf.format((d.columns||[]).length)+' עמודות'+(d.filters&&Object.keys(d.filters).length?' · עם סינון':'');
 if(action==='user.disconnect')return d.disable?'נותק והושבת':'נותק';
 if(action==='contact.save'&&d.fields)return nf.format(d.fields.length)+' שדות';
 if(action==='contacts.import')return nf.format(d.rows)+' שורות · '+(d.mode==='update'?'עדכון':'דילוג על קיימים');
 if(action.indexOf('list.')===0)return d.size!==undefined?nf.format(d.size)+' מספרים'+(d.shared?' · משותפת':''):'';
 if(action==='optout.add')return nf.format(d.count)+' מספרים';
 if(action.indexOf('user.')===0)return [d.role==='admin'?'מנהל':'משתמש',d.active===false?'מושבת':'',d.numbers&&d.role!=='admin'?nf.format(d.numbers.length)+' מספרים':'',d.can_bulk_send&&d.role!=='admin'?'שליחה מרובה':'',d.can_edit_contacts===false&&d.role!=='admin'?'ללא עריכת לקוחות':'',d.daily_limit!==null&&d.daily_limit!==undefined&&d.role!=='admin'?'מגבלה '+nf.format(d.daily_limit):''].filter(Boolean).join(' · ');
 if(action.indexOf('number.')===0)return d.label+(d.active===false?' · מושבת':'');
 return Object.keys(d).map(function(k){const v=d[k];return k+': '+(Array.isArray(v)?v.join(', '):String(v));}).join(' · ');}
async function loadAudit(reset){if(reset){auditBefore=null;$('a-rows').replaceChildren();}
 const d=await get('/api/admin/audit'+(auditBefore?'?before='+auditBefore:''));const body=$('a-rows');
 for(const a of d.entries){const target=a.target&&a.target.charAt(0)==='+'?local(a.target):a.target||'—';body.append((function(){const tr=el('tr');tr.append(cell(shortFmt.format(a.at),'muted'),cell(a.email),cell(ACTIONS[a.action]||a.action),cell(target,a.target&&a.target.charAt(0)==='+'?'phone':''),cell(details(a.action,a.details),'muted'));return tr;})());auditBefore=a.id;}
 if(!body.children.length){const tr=el('tr');const td=cell('אין עדיין פעולות ביומן','muted');td.colSpan=5;tr.append(td);body.append(tr);}
 $('a-more-row').hidden=!d.more;}
$('a-more').addEventListener('click',function(){loadAudit(false).catch(error);});

(async function(){try{await loadMe();}catch(e){error(e);return;}showTab(location.hash.slice(1));})();
`;
export function adminPage(nonce:string):string { return shell(nonce,'ניהול · הודעות SMS',css,body,script); }

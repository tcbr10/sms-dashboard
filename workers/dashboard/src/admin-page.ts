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
.perm-row{flex-wrap:wrap}.perm-end{display:flex;align-items:center;gap:6px;margin-inline-start:auto}.perm-end .ghost{height:30px;padding:0 8px}
.perm-note{flex-basis:100%;font-size:12px;color:var(--accent-ink)}
#rs-date,#rs-time{width:auto}
.rule-row{display:grid;grid-template-columns:150px 130px 110px minmax(0,1fr) 32px;gap:6px;align-items:center}
.rule-row select,.rule-row input{min-height:32px}
@media (max-width:760px){.rule-row{grid-template-columns:1fr 1fr 32px}.rule-row .rule-value{grid-column:1/3}}
.settings{display:grid;gap:16px;max-width:760px;padding:18px 20px}
.optout-add{display:flex;flex:1 1 320px;gap:8px;align-items:center}
.optout-add input{flex:1;min-width:0}
.more-row{display:flex;justify-content:center;padding:14px}
.field-rows{display:grid;gap:6px}
.field-row{display:flex;align-items:center;gap:8px}
.field-row input{flex:1;min-width:0}
.online{color:var(--ink2);font-size:12.5px;white-space:nowrap}
#m-import-btn,#c-import-btn{cursor:pointer}
#mi-dlg{width:min(880px,calc(100vw - 24px))}
.mi-preview{max-height:230px;border:1px solid var(--line);border-radius:9px}
.mi-preview .list{min-width:660px}
.mi-body{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mi-errors{margin:0;padding-inline-start:18px}
.section-title{padding:12px 14px 4px;font-size:13px;font-weight:650;color:var(--ink2)}
.url-cell{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:right}
#bf-dlg,#ba-dlg{width:min(900px,calc(100vw - 24px))}
.steps{display:grid;gap:12px}
.step-card{display:grid;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--field)}
.step-head{display:flex;align-items:center;gap:8px}.step-head .end{display:flex;gap:2px}.step-head b{font-size:14px}.step-head select{width:auto;min-height:32px}
.opt-row{display:grid;grid-template-columns:110px minmax(0,1fr) minmax(0,1fr) 32px;gap:6px;align-items:center}
.opt-row input,.opt-row select{min-height:32px}
.opt-head{font-size:12px;color:var(--muted)}
@media (max-width:760px){.opt-row{grid-template-columns:80px minmax(0,1fr) 32px}.opt-row .opt-next{grid-column:2/3}}
.secret-row{display:flex;gap:8px;align-items:center}.secret-row input{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:12.5px}
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
 <label class="fld"><span>תשובות הבוט נשלחות</span><select id="nd-bot"><option value="response">כתשובה ל-Webhook (שירות טקסט דינמי)</option><option value="api">דרך ממשק השליחה (הודעות שמגיעות מאוטומציה)</option></select></label>
 <p class="hint">מיקרופיי שולח את התשובה שמוחזרת ל-Webhook רק בשירות טקסט דינמי. כשההודעות למספר מגיעות מאוטומציה, יש לבחור "דרך ממשק השליחה".</p>
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
<dialog id="rs-dlg" aria-labelledby="rs-title"><form class="dialog-body" id="rs-form" novalidate>
 <div class="dialog-head"><h2 id="rs-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="fld"><span class="label">להציג הודעות רק מ-</span><div class="row"><input type="date" id="rs-date" class="field" aria-label="מתאריך"><input type="time" id="rs-time" class="field" aria-label="משעה"><button type="button" class="ghost" id="rs-date-clear">ללא הגבלת זמן</button></div><p class="hint">ריק: כל ההודעות, כולל ההיסטוריה.</p></div>
 <div class="fld"><span class="label">ורק הודעות שעונות על כל התנאים</span><div class="field-rows" id="rs-rules"></div><div class="row"><button type="button" class="ghost" id="rs-add">`+svg('plus')+String.raw`הוספת תנאי</button><span class="hint">תנאי על איש קשר או על תשובת בוט חל על כל ההודעות של אותו לקוח.</span></div></div>
 <div class="banner" id="rs-error" role="alert" hidden></div>
 <div class="dialog-foot"><button type="button" class="ghost danger" id="rs-clear">הסרת כל ההגבלות</button><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn">אישור</button></div>
</form></dialog>
<dialog id="fm-dlg" aria-labelledby="fm-title"><form class="dialog-body" id="fm-form" novalidate>
 <div class="dialog-head"><h2 id="fm-title">שדות אנשי קשר</h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <p class="hint">השדות מופיעים כעמודות בטבלת ההודעות, בחיפוש, בסינון ובייצוא, בעריכת פרטי לקוח ובשמירת תשובות של הבוט. אפשר להגדיר עד 20 שדות. הסרת שדה מסתירה אותו בלבד; הנתונים שנשמרו בו לא נמחקים.</p>
 <div class="field-rows" id="fm-fields"></div>
 <div class="row"><button type="button" class="ghost" id="fm-add">`+svg('plus')+String.raw`הוספת שדה</button></div>
 <div class="banner" id="fm-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="fm-save">שמירה</button></div>
</form></dialog>
<dialog id="bf-dlg" aria-labelledby="bf-title"><form class="dialog-body" id="bf-form" novalidate>
 <div class="dialog-head"><h2 id="bf-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="grid2"><label class="fld"><span>שם התהליך</span><input id="bf-name" maxlength="60" placeholder="לדוגמה: סקר התעניינות"></label><label class="fld"><span>מספר</span><select id="bf-number"></select></label></div>
 <div class="fld"><span class="label">מתי התהליך מתחיל</span><div class="seg" role="group" aria-label="התחלה"><button type="button" data-trigger="any" aria-pressed="true">כל הודעה נכנסת</button><button type="button" data-trigger="keyword" aria-pressed="false">מילת מפתח</button><button type="button" data-trigger="send" aria-pressed="false">רק משליחה מהלוח</button></div>
  <input id="bf-keyword" class="field" maxlength="30" placeholder="מילת המפתח (ההודעה כולה או המילה הראשונה בה)" hidden><p class="hint" id="bf-trigger-hint"></p></div>
 <div class="grid2"><label class="fld"><span>שיחה נסגרת אחרי שקט של (שעות)</span><input type="number" id="bf-expire" min="1" max="720"></label><label class="fld"><span>הודעה לתשובה לא מזוהה</span><input id="bf-fallback" maxlength="300" placeholder="לא זיהינו את התשובה."></label></div>
 <div class="fld"><span class="label">שלבים</span><div class="steps" id="bf-steps"></div><div class="row"><button type="button" class="ghost" id="bf-add-step">`+svg('plus')+String.raw`הוספת שלב</button><span class="hint">השלב הראשון נשלח כשהתהליך מתחיל. תשובה לא מזוהה חוזרת על השאלה פעמיים ואז השיחה נסגרת. לקוח שמשיב במילת הסרה יוצא מהתהליך.</span></div></div>
 <label class="check"><input type="checkbox" id="bf-active">התהליך פעיל</label>
 <div class="banner" id="bf-error" role="alert" hidden></div>
 <div class="dialog-foot"><button type="button" class="ghost danger" id="bf-delete">מחיקת התהליך</button><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="bf-save">שמירה</button></div>
</form></dialog>
<dialog id="ba-dlg" aria-labelledby="ba-title"><div class="dialog-body">
 <div class="dialog-head"><h2 id="ba-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="table-wrap rp-wrap"><table><thead><tr><th><span>זמן</span></th><th><span>לקוח</span></th><th><span>שאלה</span></th><th><span>תשובה</span></th><th><span>משמעות</span></th></tr></thead><tbody id="ba-rows"></tbody></table></div>
 <div class="dialog-foot"><button type="button" class="ghost" id="ba-export">`+svg('download')+String.raw`ייצוא ל-CSV</button><span class="end"></span><button type="button" class="btn" data-close>סגירה</button></div>
</div></dialog>
<dialog id="fw-dlg" aria-labelledby="fw-title"><form class="dialog-body" id="fw-form" novalidate>
 <div class="dialog-head"><h2 id="fw-title"></h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <div class="grid2"><label class="fld"><span>שם הכלל</span><input id="fw-name" maxlength="60" required placeholder="לדוגמה: מערכת CRM"></label><label class="fld"><span>הודעות נכנסות למספר</span><select id="fw-number"></select></label></div>
 <label class="fld"><span>כתובת ה-Webhook</span><input id="fw-url" dir="ltr" maxlength="500" placeholder="https://example.com/sms"></label>
 <label class="fld"><span>רק מהשולחים האלה (ריק = כל השולחים)</span><textarea id="fw-senders" dir="ltr" rows="2" placeholder="מספרים מופרדים בפסיק או בשורה חדשה"></textarea></label>
 <div class="fld"><span class="label">פורמט</span><div class="seg" role="group" aria-label="פורמט"><button type="button" data-fwformat="json" aria-pressed="true">JSON</button><button type="button" data-fwformat="micropay" aria-pressed="false">כמו Webhook של מיקרופיי</button></div><p class="hint" id="fw-format-hint"></p></div>
 <label class="fld"><span>כותרות נוספות (אחת בכל שורה, בצורה Name: value)</span><textarea id="fw-headers" dir="ltr" rows="2" placeholder="Authorization: Bearer ..."></textarea></label>
 <div class="fld" id="fw-secret-row"><span class="label">מפתח חתימה</span><div class="secret-row"><input id="fw-secret" dir="ltr" readonly aria-label="מפתח חתימה"><button type="button" class="ghost" id="fw-secret-new">החלפת המפתח</button></div><p class="hint">כל בקשה כוללת כותרת X-SMS-Signature: sha256=HMAC של גוף הבקשה עם המפתח הזה, כדי שהצד המקבל יוכל לוודא שהיא הגיעה מכאן.</p></div>
 <label class="check"><input type="checkbox" id="fw-active">הכלל פעיל</label>
 <div class="banner" id="fw-error" role="alert" hidden></div>
 <div class="dialog-foot"><button type="button" class="ghost danger" id="fw-delete">מחיקת הכלל</button><button type="button" class="ghost" id="fw-test">`+svg('flask')+String.raw`שליחת בדיקה</button><span class="end"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="fw-save">שמירה</button></div>
</form></dialog>
<dialog id="mi-dlg" aria-labelledby="mi-title"><form class="dialog-body" id="mi-form" novalidate>
 <div class="dialog-head"><h2 id="mi-title">ייבוא הודעות</h2><button type="button" class="icon-btn" data-close aria-label="סגירה">`+svg('close')+String.raw`</button></div>
 <p class="hint" id="mi-info"></p>
 <div class="grid2" id="mi-map"></div>
 <label class="check"><input type="checkbox" id="mi-header">השורה הראשונה בקובץ היא כותרות</label>
 <div class="grid2"><label class="fld"><span>מספר מערכת לשורות בלי מספר מערכת</span><select id="mi-sn"></select></label><div class="fld"><span class="label">כיוון לשורות בלי כיוון</span><div class="seg" role="group" aria-label="כיוון ברירת מחדל"><button type="button" data-dir="in" aria-pressed="true">נכנסות</button><button type="button" data-dir="out" aria-pressed="false">יוצאות</button></div></div></div>
 <div class="fld"><span class="label">תצוגה מקדימה</span><div class="table-wrap mi-preview"><table class="list"><thead><tr><th><span>שורה</span></th><th><span>זמן</span></th><th><span>כיוון</span></th><th><span>לקוח</span></th><th><span>מספר מערכת</span></th><th><span>הודעה</span></th></tr></thead><tbody id="mi-preview"></tbody></table></div></div>
 <p class="hint" id="mi-summary"></p>
 <ul class="hint bad mi-errors" id="mi-errors" hidden></ul>
 <div class="bar" id="mi-bar" hidden><div id="mi-progress"></div></div>
 <div class="banner" id="mi-error" role="alert" hidden></div>
 <div class="dialog-foot"><span class="hint" id="mi-status"></span><button type="button" class="ghost" data-close>ביטול</button><button type="submit" class="btn" id="mi-go">ייבוא</button></div>
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
 <nav class="tabs" role="tablist" aria-label="ניהול"><button type="button" role="tab" data-tab="users">משתמשים</button><button type="button" role="tab" data-tab="numbers">מספרים</button><button type="button" role="tab" data-tab="contacts">אנשי קשר</button><button type="button" role="tab" data-tab="optouts">רשימת הסרה</button><button type="button" role="tab" data-tab="imports">ייבוא הודעות</button><button type="button" role="tab" data-tab="bot">בוט</button><button type="button" role="tab" data-tab="forwards">העברה ל-Webhook</button><button type="button" role="tab" data-tab="settings">הגדרות</button><button type="button" role="tab" data-tab="audit">יומן פעולות</button></nav>
 <div class="banner panel" id="error" role="alert" hidden><span id="error-text"></span></div>
 <section class="panel" data-panel="users" hidden>
  <div class="toolbar"><label class="field search">`+svg('search')+String.raw`<input id="u-q" type="search" placeholder="חיפוש לפי שם או אימייל" aria-label="חיפוש משתמשים"></label><span class="hint end" id="u-access" hidden></span><button type="button" class="ghost" id="u-access-sync" hidden>סנכרון עם Cloudflare</button><button type="button" class="btn" id="u-add">`+svg('plus')+String.raw`הוספת משתמש</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>משתמש</span></th><th><span>תפקיד</span></th><th><span>מספרים</span></th><th><span>שליחה מרובה</span></th><th><span>נשלחו ב-24 שעות</span></th><th><span>כניסה אחרונה</span></th><th><span>סטטוס</span></th></tr></thead><tbody id="u-rows"></tbody></table></div>
 </section>
 <section class="panel" data-panel="numbers" hidden>
  <div class="toolbar"><span class="hint">מספר חדש צריך גם שירות טקסט דינמי במיקרופיי שמפנה לכתובת הקליטה.</span><button type="button" class="btn end" id="n-add">`+svg('plus')+String.raw`הוספת מספר</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>שם תצוגה</span></th><th><span>מספר</span></th><th><span>סטטוס</span></th><th><span>משתמשים משויכים</span></th></tr></thead><tbody id="n-rows"></tbody></table></div>
 </section>
 <section class="panel" data-panel="contacts" hidden>
  <div class="toolbar"><label class="field search">`+svg('search')+String.raw`<input id="c-q" type="search" placeholder="חיפוש לפי מספר או פרטים" aria-label="חיפוש אנשי קשר"></label><label class="ghost end" id="c-import-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="c-file" accept=".csv,.txt,.xlsx" hidden></label><button type="button" class="ghost" id="c-fields">`+svg('columns')+String.raw`ניהול שדות</button><button type="button" class="btn" id="c-add">`+svg('plus')+String.raw`הוספת איש קשר</button></div>
  <div class="table-wrap"><table class="list"><thead><tr id="c-head"></tr></thead><tbody id="c-rows"></tbody></table></div>
  <div class="foot"><span id="c-count"></span><span>הפרטים מוצגים לצד מספר הלקוח בטבלת ההודעות ובייצוא. את השדות מגדירים בלשונית ההגדרות.</span></div>
 </section>
 <section class="panel" data-panel="optouts" hidden>
  <form class="toolbar" id="o-form"><label class="field search">`+svg('search')+String.raw`<input id="o-q" type="search" placeholder="חיפוש מספר" aria-label="חיפוש ברשימת ההסרה"></label><div class="optout-add"><input id="o-add" class="field" placeholder="הוספת מספרים, מופרדים בפסיק" aria-label="מספרים להוספה"><button type="submit" class="btn">הוספה</button></div></form>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>מספר</span></th><th><span>מקור</span></th><th><span>נוסף</span></th><th><span>על ידי</span></th><th><span></span></th></tr></thead><tbody id="o-rows"></tbody></table></div>
  <div class="foot"><span id="o-count"></span><span>מספרים ברשימה מדולגים בכל שליחה. לקוח שעונה במילת הסרה נוסף אוטומטית.</span></div>
 </section>
 <section class="panel" data-panel="imports" hidden>
  <div class="toolbar"><span class="hint">ייבוא היסטוריית הודעות מקובץ Excel או CSV. שום הודעה לא נשלחת, והודעות שכבר נמצאות במערכת מדולגות.</span><label class="btn end" id="m-import-btn">`+svg('file')+String.raw`ייבוא מקובץ<input type="file" id="m-file" accept=".csv,.txt,.xlsx" hidden></label></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>זמן</span></th><th><span>קובץ</span></th><th><span>על ידי</span></th><th><span>שורות</span></th><th><span>נוספו</span></th><th><span>כפולות שדולגו</span></th><th><span>לא תקינות</span></th><th><span></span></th></tr></thead><tbody id="m-rows"></tbody></table></div>
  <div class="foot"><span></span><span>ביטול ייבוא מסיר רק את ההודעות שהוא הוסיף. מספרים שנוספו לרשימת ההסרה נשארים בה.</span></div>
 </section>
 <section class="panel" data-panel="bot" hidden>
  <div class="toolbar"><span class="hint">תהליכים שעונים אוטומטית להודעות נכנסות ושואלים שאלה אחרי שאלה. התשובות נשמרות, ואפשר לשמור אותן בשדות אנשי הקשר.</span><button type="button" class="btn end" id="b-add">`+svg('plus')+String.raw`תהליך חדש</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>שם</span></th><th><span>מספר</span></th><th><span>התחלה</span></th><th><span>שלבים</span></th><th><span>שיחות פעילות</span></th><th><span>תשובות</span></th><th><span>סטטוס</span></th><th><span></span></th></tr></thead><tbody id="b-rows"></tbody></table></div>
 </section>
 <section class="panel" data-panel="forwards" hidden>
  <div class="toolbar"><span class="hint">הודעות נכנסות למספר נשלחות לכתובת Webhook. תקלה בכתובת לא משפיעה על קליטת ההודעות, ומשלוח שנכשל מנוסה שוב במשך כיממה.</span><button type="button" class="btn end" id="f-add">`+svg('plus')+String.raw`כלל חדש</button></div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>שם</span></th><th><span>מספר</span></th><th><span>שולחים</span></th><th><span>כתובת</span></th><th><span>פורמט</span></th><th><span>סטטוס</span></th></tr></thead><tbody id="f-rows"></tbody></table></div>
  <div class="section-title">משלוחים אחרונים</div>
  <div class="table-wrap"><table class="list"><thead><tr><th><span>זמן</span></th><th><span>כלל</span></th><th><span>לקוח</span></th><th><span>הודעה</span></th><th><span>מצב</span></th><th><span>ניסיונות</span></th><th><span>תשובה אחרונה</span></th><th><span></span></th></tr></thead><tbody id="fl-rows"></tbody></table></div>
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
const TABS=['users','numbers','contacts','optouts','imports','bot','forwards','settings','audit'];
const ACTIONS={'user.create':'משתמש נוסף','user.update':'משתמש עודכן','user.delete':'משתמש נמחק','number.create':'מספר נוסף','number.update':'מספר עודכן','settings.update':'ההגדרות עודכנו','optout.add':'נוספו לרשימת ההסרה','optout.remove':'הוסר מרשימת ההסרה','send':'שליחת הודעה','export':'ייצוא הודעות','user.disconnect':'ניתוק משתמש','user.logout':'התנתקות','access.sync':'סנכרון Cloudflare Access','messages.import':'ייבוא הודעות','flow.save':'תהליך בוט נשמר','flow.delete':'תהליך בוט נמחק','bot.block':'הבוט הושבת ללקוח','bot.unblock':'הבוט הופעל מחדש ללקוח','forward.save':'כלל העברה נשמר','forward.delete':'כלל העברה נמחק','forward.test':'בדיקת Webhook','forward.secret':'מפתח חתימה הוחלף','forward.resend':'שליחה מחדש ל-Webhook','messages.import.undo':'ביטול ייבוא הודעות','contact.save':'איש קשר נשמר','contact.delete':'איש קשר נמחק','contacts.import':'ייבוא אנשי קשר','list.save':'רשימת תפוצה נשמרה','list.delete':'רשימת תפוצה נמחקה'};
const SEND_STATUS={accepted:'התקבלה',rejected:'נדחתה',unknown:'לא ידוע',sending:'בשליחה'};
let USERS=[],NUMBERS=[],SETTINGS=null,OPTOUTS=[],CONTACTS=[],auditBefore=null,importRows=null,importMode='update';
function error(e){$('error').hidden=false;$('error-text').textContent=message(e);}
function dlgError(id,e){$(id).hidden=false;$(id).textContent=message(e);}
function cell(text,cls){return el('td',cls,text);}
function seen(ms){return ms?shortFmt.format(ms):'טרם התחבר';}
function showTab(t){if(!TABS.includes(t))t='users';for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===t));
 for(const p of document.querySelectorAll('[data-panel]'))p.hidden=p.dataset.panel!==t;if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);$('error').hidden=true;
 ({users:loadUsers,numbers:loadNumbers,contacts:loadContacts,optouts:loadOptouts,imports:loadImports,bot:loadFlows,forwards:loadForwards,settings:loadSettings,audit:function(){return loadAudit(true);}})[t]().catch(error);}
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',function(){showTab(b.dataset.tab);});
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',function(){b.closest('dialog').close();});
// Connected: seen in the last two minutes and not disconnected since.
function online(u){return u.active&&u.last_seen_at&&Date.now()-u.last_seen_at<120000&&!(u.sessions_revoked_at&&u.sessions_revoked_at>u.last_seen_at);}

async function loadUsers(){const r=await Promise.all([get('/api/admin/users'),get('/api/admin/numbers'),get('/api/admin/settings')]);USERS=r[0].users;NUMBERS=r[1].numbers;SETTINGS=r[2];renderUsers();renderAccess(r[0].access);}
// Cloudflare Access sync: the last result, and a manual sync for when an automatic one failed.
function renderAccess(a){const on=!!(a&&a.configured);$('u-access').hidden=$('u-access-sync').hidden=!on;if(!on)return;const l=a.last;
 $('u-access').textContent=!l?'Cloudflare Access: עדיין לא סונכרן':l.ok?'Cloudflare Access סונכרן '+shortFmt.format(l.at)+' · '+plural(l.emails,'משתמש אחד','משתמשים'):'סנכרון Cloudflare Access נכשל ('+shortFmt.format(l.at)+'): '+l.error;$('u-access').className='hint end'+(l&&!l.ok?' bad':'');}
// Reports a failed automatic sync after a user change; the change itself was saved.
function accessResult(done,a){if(a&&!a.ok)toast(done+', אבל העדכון ב-Cloudflare Access נכשל: '+a.error);else toast(done+(a&&a.ok?' · Cloudflare Access עודכן':''));}
$('u-access-sync').addEventListener('click',async function(){const b=this;b.disabled=true;try{const d=await post('/api/admin/users/access-sync',{});accessResult('הסנכרון הסתיים',d.access);await loadUsers();}catch(err){error(err);}finally{b.disabled=false;}});
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
 UD=new Map();for(const x of (u?u.numbers:[]))if(x.view_from!==null&&x.view_from!==undefined||x.view_rules&&x.view_rules.length)UD.set(x.number,{view_from:x.view_from??null,view_rules:x.view_rules||[]});
 for(const n of NUMBERS){const current=u&&u.numbers.find(function(x){return x.number===n.number;});const row=el('div','perm-row');const name=el('span');name.append(n.label+' · ',el('span','phone',local(n.number)));if(!n.active)name.append(el('span','muted',' (מושבת)'));
  const sel=el('select');sel.dataset.number=n.number;sel.setAttribute('aria-label','גישה ל-'+n.label);for(const o of [['','ללא גישה'],['view','צפייה'],['send','צפייה ושליחה']]){const opt=el('option','',o[1]);opt.value=o[0];sel.append(opt);}sel.value=current?(current.can_send?'send':'view'):'';
  const rb=el('button','ghost','הגבלות');rb.type='button';rb.addEventListener('click',function(){openRestrict(n);});const note=el('span','perm-note');note.dataset.note=n.number;
  const end=el('span','perm-end');end.append(rb,sel);row.append(name,end,note);perms.append(row);const sync=function(){rb.disabled=!sel.value;note.textContent=sel.value?restrictSummary(UD.get(n.number)):'';};sel.addEventListener('change',sync);sync();}
 if(!NUMBERS.length)perms.append(el('p','hint','עדיין לא הוגדרו מספרים.'));
 $('ud-delete').hidden=$('ud-disconnect').hidden=!u||u.email===ME.email;$('ud-error').hidden=true;roleChanged();$('user-dlg').showModal();(u?$('ud-name'):$('ud-email')).focus();}
// View restrictions per number: messages from a date onward, and only those matching every condition.
let UD=new Map(),RS=null;
const RULE_TYPES=[['field','שדה איש קשר'],['answer','תשובת בוט'],['text','תוכן ההודעה'],['direction','כיוון']];
function ruleText(r){const v='"'+r.value+'"';if(r.type==='direction')return r.value==='in'?'רק נכנסות':'רק יוצאות';if(r.type==='text')return 'הודעה מכילה '+v;
 const op=r.op==='eq'?' = ':' מכיל ';if(r.type==='answer')return 'תשובת בוט'+op+v;const f=(SETTINGS.contact_fields||[]).find(function(x){return x.id===r.field;});return (f?f.label:r.field)+op+v;}
function restrictSummary(r){if(!r)return '';const parts=[];if(r.view_from!==null&&r.view_from!==undefined)parts.push('מ-'+shortFmt.format(r.view_from));for(const x of r.view_rules||[])parts.push(ruleText(x));return parts.length?'מוגבל: '+parts.join(' · '):'';}
function openRestrict(n){const cur=UD.get(n.number);RS={number:n.number,rules:JSON.parse(JSON.stringify(cur?cur.view_rules:[]))};$('rs-title').textContent='הגבלות צפייה · '+n.label;
 if(cur&&cur.view_from!==null){const z=zoned(cur.view_from);$('rs-date').value=ymd(cur.view_from);$('rs-time').value=pad(z.hour)+':'+pad(z.minute);}else{$('rs-date').value='';$('rs-time').value='';}
 $('rs-error').hidden=true;renderRules();$('rs-dlg').showModal();}
function renderRules(){const box=$('rs-rules');box.replaceChildren();
 RS.rules.forEach(function(r,i){const row=el('div','rule-row');const type=el('select');type.setAttribute('aria-label','סוג התנאי');for(const t of RULE_TYPES){const o=el('option','',t[1]);o.value=t[0];type.append(o);}type.value=r.type;
  type.addEventListener('change',function(){RS.rules[i]=type.value==='direction'?{type:'direction',value:'in'}:type.value==='text'?{type:'text',value:r.value&&r.type!=='direction'?r.value:''}:type.value==='field'?{type:'field',field:(SETTINGS.contact_fields[0]||{}).id||'',op:'eq',value:''}:{type:'answer',op:'eq',value:''};renderRules();});
  const field=el('select');field.setAttribute('aria-label','שדה');for(const f of SETTINGS.contact_fields){const o=el('option','',f.label);o.value=f.id;field.append(o);}if(r.type==='field')field.value=r.field;field.addEventListener('change',function(){r.field=field.value;});field.style.visibility=r.type==='field'?'visible':'hidden';
  const op=el('select');op.setAttribute('aria-label','השוואה');for(const o of [['eq','שווה ל-'],['contains','מכיל']]){const x=el('option','',o[1]);x.value=o[0];op.append(x);}if(r.op)op.value=r.op;op.addEventListener('change',function(){r.op=op.value;});op.style.visibility=r.type==='field'||r.type==='answer'?'visible':'hidden';
  let value;if(r.type==='direction'){value=el('select','rule-value');for(const o of [['in','נכנסות בלבד'],['out','יוצאות בלבד']]){const x=el('option','',o[1]);x.value=o[0];value.append(x);}value.value=r.value;value.addEventListener('change',function(){r.value=value.value;});}
  else{value=el('input','rule-value');value.maxLength=200;value.value=r.value||'';value.placeholder=r.type==='answer'?'לדוגמה: מעוניין':r.type==='text'?'מילה או ביטוי':'ערך';value.setAttribute('aria-label','ערך');value.addEventListener('input',function(){r.value=value.value;});}
  const x=el('button','icon-btn');x.type='button';x.setAttribute('aria-label','הסרת התנאי');x.append(icon('close'));x.addEventListener('click',function(){RS.rules.splice(i,1);renderRules();});
  row.append(type,field,op,value,x);box.append(row);});
 if(!RS.rules.length)box.append(el('p','hint','אין תנאים: כל ההודעות של המספר (מהתאריך שנבחר, אם נבחר).'));}
$('rs-add').addEventListener('click',function(){if(RS.rules.length>=10){toast('אפשר עד 10 תנאים');return;}RS.rules.push(SETTINGS.contact_fields.length?{type:'field',field:SETTINGS.contact_fields[0].id,op:'eq',value:''}:{type:'answer',op:'eq',value:''});renderRules();});
$('rs-date-clear').addEventListener('click',function(){$('rs-date').value='';$('rs-time').value='';});
$('rs-clear').addEventListener('click',function(){UD.delete(RS.number);updateNote(RS.number);$('rs-dlg').close();});
function updateNote(number){const note=document.querySelector('[data-note="'+number+'"]');if(note)note.textContent=restrictSummary(UD.get(number));}
$('rs-form').addEventListener('submit',function(e){e.preventDefault();for(const r of RS.rules)if(r.type!=='direction'&&!String(r.value||'').trim()){dlgError('rs-error',new Error('לכל תנאי צריך ערך'));return;}
 const d=$('rs-date').value;const from=d?israelTime(d,$('rs-time').value||'00:00'):null;const rules=RS.rules.map(function(r){return r.type==='direction'?{type:'direction',value:r.value}:r.type==='text'?{type:'text',value:r.value.trim()}:r.type==='answer'?{type:'answer',op:r.op||'eq',value:r.value.trim()}:{type:'field',field:r.field,op:r.op||'eq',value:r.value.trim()};});
 if(from===null&&!rules.length)UD.delete(RS.number);else UD.set(RS.number,{view_from:from,view_rules:rules});updateNote(RS.number);$('rs-dlg').close();toast('ההגבלות יישמרו בלחיצה על "שמירה" בחלון המשתמש');});
function roleChanged(){const admin=$('ud-role').value==='admin';$('ud-admin-note').hidden=!admin;$('ud-perms').hidden=admin;$('ud-bulk').disabled=admin;$('ud-contacts').disabled=admin;$('ud-limit').disabled=admin;}
$('ud-role').addEventListener('change',roleChanged);
$('u-q').addEventListener('input',renderUsers);
$('u-add').addEventListener('click',function(){openUser(null);});
$('u-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-email]');if(tr)openUser(tr.dataset.email);});
$('u-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.email){e.preventDefault();openUser(e.target.dataset.email);}});
$('ud-form').addEventListener('submit',async function(e){e.preventDefault();const editing=$('ud-email').readOnly;const limit=$('ud-limit').value.trim();
 if(limit!==''&&!/^[0-9]+$/.test(limit)){dlgError('ud-error',new Error('מגבלת הנמענים צריכה להיות מספר שלם'));return;}
 const test=$('ud-test').value.trim();if(test&&!normalize(test)){dlgError('ud-error',new Error('מספר הבדיקה אינו תקין'));return;}
 const numbers=[];for(const s of $('ud-perms').querySelectorAll('select'))if(s.value){const r=UD.get(s.dataset.number);numbers.push({number:s.dataset.number,can_send:s.value==='send',view_from:r?r.view_from:null,view_rules:r&&r.view_rules.length?r.view_rules:null});}
 $('ud-save').disabled=true;
 try{const d=await post('/api/admin/users/save',{create:!editing,email:$('ud-email').value.trim(),name:$('ud-name').value,role:$('ud-role').value,active:$('ud-active').checked,can_bulk_send:$('ud-bulk').checked,can_edit_contacts:$('ud-contacts').checked,daily_limit:limit===''?null:Number(limit),test_number:test?normalize(test):null,numbers:numbers});
  $('user-dlg').close();accessResult(editing?'המשתמש עודכן':'המשתמש נוסף',d.access);await loadUsers();}
 catch(err){dlgError('ud-error',err);}finally{$('ud-save').disabled=false;}});
$('ud-delete').addEventListener('click',async function(){const email=$('ud-email').value;$('user-dlg').close();
 if(!await confirmAction('מחיקת משתמש','למחוק את '+email+'? הגישה שלו תיחסם מיד. הודעות שהוא שלח יישארו בטבלה.','מחיקה'))return;
 try{const d=await post('/api/admin/users/delete',{email:email});accessResult('המשתמש נמחק',d.access);await loadUsers();}catch(err){error(err);}});
$('ud-disconnect').addEventListener('click',async function(){const email=$('ud-email').value;$('user-dlg').close();
 const a=await confirmAction('ניתוק משתמש','לנתק את '+email+'? החיבור הנוכחי שלו יסתיים מיד והוא יצטרך להתחבר מחדש עם קוד חד-פעמי.','ניתוק','וגם להשבית את המשתמש, כדי שלא יוכל להתחבר שוב');if(!a)return;
 try{const d=await post('/api/admin/users/disconnect',{email:email,disable:a.checked});accessResult(a.checked?'המשתמש נותק והושבת':'המשתמש נותק',d.access);await loadUsers();}catch(err){error(err);}});

async function loadNumbers(){NUMBERS=(await get('/api/admin/numbers')).numbers;const body=$('n-rows');body.replaceChildren();
 for(const n of NUMBERS){const tr=el('tr','click');tr.tabIndex=0;tr.dataset.number=n.number;const status=el('td');status.append(el('span','tag'+(n.active?'':' off'),n.active?'פעיל':'מושבת'));
  tr.append(cell(n.label),cell(local(n.number),'phone'),status,cell(nf.format(n.users)));body.append(tr);}
 if(!NUMBERS.length){const tr=el('tr');const td=cell('עדיין לא הוגדרו מספרים','muted');td.colSpan=4;tr.append(td);body.append(tr);}}
function openNumber(number){const n=number?NUMBERS.find(function(x){return x.number===number;}):null;$('nd-title').textContent=n?'עריכת מספר':'מספר חדש';
 $('nd-number').value=n?local(n.number):'';$('nd-number').readOnly=!!n;$('nd-label').value=n?n.label:'';$('nd-active').checked=n?!!n.active:true;$('nd-bot').value=n&&n.bot_reply||'response';$('nd-error').hidden=true;activeNote();$('num-dlg').showModal();(n?$('nd-label'):$('nd-number')).focus();}
function activeNote(){$('nd-note').textContent=$('nd-active').checked?'':'מספר מושבת מוסתר מכל המשתמשים, והודעות נכנסות אליו נדחות. מיקרופיי עשוי לשלוח ללקוח הודעת שגיאה.';$('nd-note').className='hint'+($('nd-active').checked?'':' bad');}
$('nd-active').addEventListener('change',activeNote);
$('n-add').addEventListener('click',function(){openNumber(null);});
$('n-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-number]');if(tr)openNumber(tr.dataset.number);});
$('n-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.number){e.preventDefault();openNumber(e.target.dataset.number);}});
$('nd-form').addEventListener('submit',async function(e){e.preventDefault();const editing=$('nd-number').readOnly;const number=normalize($('nd-number').value);
 if(!number){dlgError('nd-error',new Error('מספר הטלפון אינו תקין'));return;}
 try{await post('/api/admin/numbers/save',{create:!editing,number:number,label:$('nd-label').value,active:$('nd-active').checked,bot_reply:$('nd-bot').value});$('num-dlg').close();toast(editing?'המספר עודכן':'המספר נוסף');await loadNumbers();}
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
 const rows=[],problems=[];
 for(let i=$('ci-header').checked?1:0;i<importRows.length;i++){const r=importRows[i];const raw=String(r[phoneCol]||'').trim();if(!raw)continue;const p=parsePhone(raw);
  if(!p.number){problems.push({row:i+1,value:raw,reason:PHONE_PROBLEMS[p.problem]});continue;}const data={};for(const m of map)data[m[0]]=r[m[1]]||'';rows.push({number:p.number,data:data});}
 if(!rows.length){if(problems.length)showReport('שורות שלא יובאו','אף שורה לא יובאה.',problems);else dlgError('ci-error',new Error('לא נמצאו שורות עם מספר טלפון'));return;}
 $('ci-go').disabled=true;$('ci-bar').hidden=false;let imported=0,invalid=0;
 try{for(let i=0;i<rows.length;i+=1000){const d=await post('/api/admin/contacts/import',{mode:importMode,rows:rows.slice(i,i+1000)});imported+=d.imported;invalid+=d.invalid;$('ci-progress').style.width=Math.min(100,(i+1000)/rows.length*100)+'%';$('ci-status').textContent='יובאו '+nf.format(imported);}
  $('ci-dlg').close();invalid+=problems.length;const summary=plural(imported,'יובא איש קשר אחד','אנשי קשר יובאו')+(invalid?' · '+plural(invalid,'שורה אחת עם מספר לא תקין','שורות עם מספר לא תקין'):'');
  if(problems.length)showReport('שורות שלא יובאו',summary,problems);else toast(summary);await loadContacts();}
 catch(err){dlgError('ci-error',err);}finally{$('ci-go').disabled=false;}});

// Message import. The browser maps columns, parses dates in Israel time and shows a preview; the server validates
// every row again, skips messages that already exist and records the import so it can be undone.
const MI={rows:null,file:'',dir:'in',parsed:null,busy:false};
const MI_FIELDS=[['peer','טלפון הלקוח'],['body','תוכן ההודעה'],['sn','מספר מערכת'],['date','תאריך (או תאריך ושעה)'],['time','שעה (בעמודה נפרדת)'],['dir','כיוון'],['status','סטטוס הגשה'],['msgid','מזהה הודעה (msgid)']];
// Header names tried in this order; each column is used for one field only.
const MI_GUESS=[['msgid',/msgid|message ?id|מזהה/],['time',/^(שעה|time|hour|שעת (שליחה|קבלה))$/],['date',/תאריך|date|זמן|time|מועד/],['dir',/כיוון|direction|^סוג$|^type$/],['status',/סטטוס|status|מצב/],['sn',/יעד|dest|מספר מערכת|וירטואלי|^to$|קו/],['peer',/טלפון|phone|נייד|mobile|שולח|sender|לקוח|from|msisdn/],['body',/הודעה|תוכן|טקסט|message|text|body|origsms|sms/]];
const MI_WRITES=8,MI_MAX=12000;
function activeNumbers(){return NUMBERS.filter(function(n){return n.active;});}
function miTime(v){v=String(v||'').trim();if(!v)return '';const m=/^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?(?:[.][0-9]+)?\s*([ap][.]?m[.]?)?$/i.exec(v);
 if(m){let h=+m[1];const ap=(m[4]||'').toLowerCase().charAt(0);if(ap==='p'&&h<12)h+=12;if(ap==='a'&&h===12)h=0;if(h>23||+m[2]>59||+(m[3]||0)>59)return null;return pad(h)+':'+m[2]+':'+(m[3]||'00');}
 if(/^0?[.][0-9]+$/.test(v)){const s=Math.round(Number(v)*86400)%86400;return pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60);}return null;}
function miDay(y,mo,d,t){y=+y;mo=+mo;d=+d;const dt=new Date(Date.UTC(y,mo-1,d));if(y<2000||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;const time=t?miTime(t):'';if(time===null)return null;return {day:y+'-'+pad(mo)+'-'+pad(d),time:time};}
// Excel date cells arrive as serial day numbers; text dates are read day-first (Israeli format) or as ISO.
function miDate(v){v=String(v||'').trim();if(!v)return '';
 if(/^[0-9]{5}([.][0-9]+)?$/.test(v)){const n=Number(v);if(n<36526||n>73051)return null;const d=new Date(Math.round((n-25569)*86400)*1000);return {day:d.toISOString().slice(0,10),time:pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds())};}
 let m=/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[T ]+(.+))?$/.exec(v);
 if(m){if(m[4]&&/(Z|[+-][0-9]{2}:?[0-9]{2})$/.test(m[4])){const ms=Date.parse(v.replace(' ','T'));return isNaN(ms)?null:{ms:ms};}return miDay(m[1],m[2],m[3],m[4]);}
 m=/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{2}|[0-9]{4})(?:[ ,T]+(.+))?$/.exec(v);if(m)return miDay(m[3].length===2?'20'+m[3]:m[3],m[2],m[1],m[4]);return null;}
// Returns milliseconds, null when the file has no time for the row, or undefined when the date or time is unreadable.
function miWhen(dv,tv){const d=miDate(dv),t=miTime(tv);if(d===null||t===null)return undefined;if(d&&d.ms!==undefined)return d.ms;if(!d&&!t)return null;return israelTime(d?d.day:today(),t||d.time||'00:00:00');}
function miDir(v){v=String(v||'').trim().toLowerCase();if(!v)return MI.dir;if(/^(in|incoming|inbound|mo|נכנס|נכנסת|נכנסות|התקבל|התקבלה|קבלה)$/.test(v))return 'in';if(/^(out|outgoing|outbound|mt|יוצא|יוצאת|יוצאות|נשלח|נשלחה|שליחה)$/.test(v))return 'out';return null;}
function miStatus(v){v=String(v||'').trim().toLowerCase();if(!v)return 'accepted';const map=[[/^(accepted|delivered|sent|ok|success|התקבל|התקבלה|נשלח|נשלחה|נמסר|נמסרה|הצלחה)$/,'accepted'],[/^(rejected|failed|error|נדחה|נדחתה|נכשל|נכשלה|שגיאה)$/,'rejected'],[/^(pending|queued|בתהליך|ממתין|ממתינה)$/,'pending'],[/^(unknown|לא ידוע)$/,'unknown']];for(const x of map)if(x[0].test(v))return x[1];return null;}
// Without header matches: system number = the column whose values are registered numbers, customer = the most phone-like
// remaining column, message = the longest text, date = the column whose values read as dates.
function miGuess(rows,header){const width=Math.min(50,Math.max.apply(null,rows.slice(0,200).map(function(r){return r.length;}).concat([1])));const map={};const used=new Set();
 if(header)for(const g of MI_GUESS)for(let c=0;c<width;c++){const h=String(rows[0][c]||'').trim().toLowerCase();if(!used.has(c)&&!map[g[0]]&&h&&g[1].test(h)){map[g[0]]=String(c);used.add(c);}}
 const sample=rows.slice(header?1:0,201);const active=new Set(activeNumbers().map(function(n){return n.number;}));
 const score=function(test){let best=-1,bestScore=0;for(let c=0;c<width;c++){if(used.has(c))continue;let s=0,n=0;for(const r of sample){const v=String(r[c]||'').trim();if(!v)continue;n++;s+=test(v);}const avg=n?s/n:0;if(avg>bestScore){bestScore=avg;best=c;}}return best;};
 const take=function(f,c){if(!map[f]&&c>=0){map[f]=String(c);used.add(c);}};
 if(!map.sn){let best=-1,top=0;for(let c=0;c<width;c++){if(used.has(c))continue;let s=0,n=0;for(const r of sample){const v=String(r[c]||'').trim();if(!v)continue;n++;if(active.has(normalize(v)))s++;}if(n&&s/n>=0.6&&s/n>top){top=s/n;best=c;}}take('sn',best);}
 if(!map.peer)take('peer',score(function(v){return normalize(v)?1:0;}));if(!map.body)take('body',score(function(v){return normalize(v)||miDate(v)?0:Math.min(v.length,200);}));if(!map.date)take('date',score(function(v){const d=miDate(v);return d?1:0;}));
 return map;}
function openMessageImport(rows,file){MI.rows=rows;MI.file=file;MI.dir='in';const pc=phoneColumn(rows);const width=Math.max(pc.width,1);const map=miGuess(rows,pc.header);
 const name=function(c){return (pc.header&&rows[0][c]?rows[0][c]:'עמודה '+(c+1));};const box=$('mi-map');box.replaceChildren();
 for(const f of MI_FIELDS){const l=el('label','fld');const sel=el('select');sel.dataset.field=f[0];const none=el('option','',f[0]==='peer'||f[0]==='body'?'בחירת עמודה':'לא בקובץ');none.value='';sel.append(none);
  for(let c=0;c<width;c++){const o=el('option','',name(c));o.value=String(c);sel.append(o);}sel.value=map[f[0]]||'';sel.addEventListener('change',miPreview);l.append(el('span','',f[1]+(f[0]==='peer'||f[0]==='body'?' *':'')),sel);box.append(l);}
 const sn=$('mi-sn');sn.replaceChildren();const none=el('option','','לא נבחר');none.value='';sn.append(none);for(const n of activeNumbers()){const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;sn.append(o);}if(activeNumbers().length===1)sn.value=activeNumbers()[0].number;
 for(const b of document.querySelectorAll('[data-dir]'))b.setAttribute('aria-pressed',String(b.dataset.dir==='in'));
 $('mi-header').checked=pc.header;$('mi-info').textContent=file+' · '+plural(rows.length,'שורה אחת','שורות');$('mi-error').hidden=true;$('mi-bar').hidden=true;$('mi-status').textContent='';miPreview();$('mi-dlg').showModal();}
function miParse(){const map={};for(const s of $('mi-map').querySelectorAll('select'))map[s.dataset.field]=s.value;const active=new Set(activeNumbers().map(function(n){return n.number;}));
 const out=[],bad=[],seen=new Map();const fallback=$('mi-sn').value;
 for(let i=$('mi-header').checked?1:0;i<MI.rows.length;i++){const r=MI.rows[i];if(!r.some(function(x){return String(x||'').trim();}))continue;
  const cellv=function(f){return map[f]===''||map[f]===undefined?'':String(r[Number(map[f])]||'').trim();};
  try{if(map.peer===''||map.body==='')throw 'יש לבחור את עמודות הטלפון וההודעה';const pp=parsePhone(cellv('peer'));if(!pp.number)throw 'מספר הלקוח: '+PHONE_PROBLEMS[pp.problem];const peer=pp.number;
   const body=String(r[Number(map.body)]||'');if(!body.trim())throw 'ההודעה ריקה';if(body.length>10000)throw 'ההודעה ארוכה מדי';
   const raw=cellv('sn');const sn=raw?normalize(raw):fallback;if(!sn)throw raw?'מספר המערכת אינו תקין':'לא נבחר מספר מערכת';if(!active.has(sn))throw 'מספר המערכת אינו רשום או אינו פעיל';
   const dir=miDir(cellv('dir'));if(!dir)throw 'כיוון לא מזוהה';const status=dir==='out'?miStatus(cellv('status')):null;if(dir==='out'&&!status)throw 'סטטוס לא מזוהה';
   const t=miWhen(cellv('date'),cellv('time'));if(t===undefined)throw 'תאריך או שעה לא מזוהים';
   const k=[dir,sn,peer,t,body].join('\u0001');const n=seen.get(k)||0;seen.set(k,n+1);
   out.push({row:i+1,direction:dir,system_number:sn,peer_number:peer,body:body,occurred_at:t,status:status,msgid:cellv('msgid')||null,n:n});}
  catch(e){bad.push({row:i+1,reason:String(e)});}}
 return {rows:out,bad:bad};}
function miPreview(){const p=miParse();MI.parsed=p;const body=$('mi-preview');body.replaceChildren();
 for(const r of p.rows.slice(0,6)){const tr=el('tr');const msg=el('td');msg.append(el('div','mi-body',r.body));
  tr.append(cell(String(r.row),'muted'),cell(r.occurred_at===null?'זמן הייבוא':shortFmt.format(r.occurred_at)),cell(r.direction==='in'?'נכנסת':'יוצאת'),cell(local(r.peer_number),'phone'),cell(labelOf(r.system_number),''),msg);body.append(tr);}
 if(!p.rows.length){const tr=el('tr');const td=cell('אין שורות תקינות להצגה','muted');td.colSpan=6;tr.append(td);body.append(tr);}
 const n=p.rows.length,over=n>MI_MAX;const noTime=p.rows.filter(function(r){return r.occurred_at===null;}).length;
 $('mi-summary').textContent=plural(n,'שורה תקינה אחת','שורות תקינות')+(p.bad.length?' · '+plural(p.bad.length,'שורה לא תקינה אחת שלא תיובא','שורות לא תקינות שלא ייובאו'):'')+(noTime?' · '+plural(noTime,'שורה אחת','שורות')+' בלי זמן יישמרו עם זמן הייבוא':'')
  +' · כ-'+nf.format(n*MI_WRITES)+' כתיבות למסד הנתונים (המסלול החינמי מאפשר 100,000 ביום)'+(over?'. אפשר לייבא עד '+nf.format(MI_MAX)+' הודעות בכל פעם; יש לפצל את הקובץ.':'');
 $('mi-summary').className='hint'+(over?' bad':'');const errs=$('mi-errors');errs.replaceChildren();errs.hidden=!p.bad.length;
 for(const b of p.bad.slice(0,8))errs.append(el('li','','שורה '+b.row+': '+b.reason));if(p.bad.length>8)errs.append(el('li','','ועוד '+nf.format(p.bad.length-8)));
 $('mi-go').disabled=!n||over||MI.busy;$('mi-go').textContent=n?'ייבוא '+plural(n,'הודעה אחת','הודעות'):'ייבוא';}
function labelOf(number){const n=NUMBERS.find(function(x){return x.number===number;});return n?n.label:local(number);}
$('mi-header').addEventListener('change',miPreview);$('mi-sn').addEventListener('change',miPreview);
for(const b of document.querySelectorAll('[data-dir]'))b.addEventListener('click',function(){MI.dir=b.dataset.dir;for(const x of document.querySelectorAll('[data-dir]'))x.setAttribute('aria-pressed',String(x===b));miPreview();});
$('m-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;
 try{if(f.size>10485760)throw new Error('הקובץ גדול מדי (עד 10MB)');const rows=await readRows(f);if(!rows.length)throw new Error('הקובץ ריק');if(!activeNumbers().length)throw new Error('אין מספרי מערכת פעילים');openMessageImport(rows,f.name);}
 catch(err){error(err);}});
// Batches of up to 500 rows and about 800KB. Retrying after a failure is safe: rows that were already added are skipped.
$('mi-form').addEventListener('submit',async function(e){e.preventDefault();const p=MI.parsed;if(!p||!p.rows.length||MI.busy)return;MI.busy=true;$('mi-go').disabled=true;$('mi-error').hidden=true;$('mi-bar').hidden=false;$('mi-progress').style.width='0';
 let added=0,duplicates=0,invalid=p.bad.length,done=0,id=null;
 try{id=(await post('/api/admin/imports/start',{file:MI.file,total:p.rows.length+p.bad.length,invalid:p.bad.length})).id;
  for(let i=0;i<p.rows.length;){let size=0,j=i;while(j<p.rows.length&&j-i<500){const s=JSON.stringify(p.rows[j]).length*3;if(j>i&&size+s>800000)break;size+=s;j++;}
   const d=await post('/api/admin/imports/rows',{id:id,rows:p.rows.slice(i,j)});added+=d.added;duplicates+=d.duplicates;invalid+=d.invalid.length;done=j;i=j;
   $('mi-progress').style.width=(done/p.rows.length*100)+'%';$('mi-status').textContent='נוספו '+nf.format(added)+' · נבדקו '+nf.format(done)+' מתוך '+nf.format(p.rows.length);}
  $('mi-dlg').close();toast(plural(added,'נוספה הודעה אחת','הודעות נוספו')+(duplicates?' · '+plural(duplicates,'כפולה אחת דולגה','כפולות דולגו'):'')+(invalid?' · '+plural(invalid,'שורה לא תקינה אחת','שורות לא תקינות'):''));}
 catch(err){dlgError('mi-error',new Error(message(err)+(id&&done?'. חלק מהשורות כבר נוספו; אפשר לנסות שוב (שורות שכבר נוספו ידולגו) או לבטל את הייבוא מהרשימה.':'')));}
 finally{MI.busy=false;miPreview();loadImports().catch(function(){});}});
async function loadImports(){const r=await Promise.all([get('/api/admin/imports'),get('/api/admin/numbers')]);NUMBERS=r[1].numbers;const body=$('m-rows');body.replaceChildren();
 for(const m of r[0].imports){const tr=el('tr');const last=el('td');
  if(m.undone_at){const t=el('span','tag off','בוטל');t.title='בוטל על ידי '+m.undone_by+' · '+shortFmt.format(m.undone_at);last.append(t);}
  else if(!m.added)last.append(el('span','dash','—'));
  else{const b=el('button','ghost danger','ביטול ייבוא');b.type='button';b.addEventListener('click',function(){undoImport(m);});last.append(b);}
  tr.append(cell(shortFmt.format(m.created_at),'muted'),cell(m.file),cell(m.email,'muted'),cell(nf.format(m.total)),cell(nf.format(m.added)),cell(nf.format(m.duplicates),'muted'),cell(nf.format(m.invalid),'muted'),last);body.append(tr);}
 if(!body.children.length){const tr=el('tr');const td=cell('עדיין לא יובאו הודעות','muted');td.colSpan=8;tr.append(td);body.append(tr);}}
async function undoImport(m){if(!await confirmAction('ביטול ייבוא','להסיר את '+plural(m.added,'ההודעה שנוספה','ההודעות שנוספו')+' בייבוא "'+m.file+'"? הודעות שהגיעו בדרך אחרת לא יושפעו.','ביטול הייבוא'))return;
 try{const d=await post('/api/admin/imports/undo',{id:m.id});toast(plural(d.removed,'הודעה אחת הוסרה','הודעות הוסרו'));await loadImports();}catch(err){error(err);}}

// Bot flows. The editor keeps the flow in BF and redraws the step cards from it; inputs write straight back into BF.
let FLOWS=[],BF=null,BA=null;
const TRIGGERS={any:'כל הודעה נכנסת',keyword:'מילת מפתח',send:'רק משליחה מהלוח'};
async function loadFlows(){const r=await Promise.all([get('/api/admin/flows'),get('/api/admin/numbers'),get('/api/admin/settings')]);FLOWS=r[0].flows;NUMBERS=r[1].numbers;SETTINGS=r[2];renderFlows();}
function renderFlows(){const body=$('b-rows');body.replaceChildren();
 for(const f of FLOWS){const tr=el('tr','click');tr.tabIndex=0;tr.dataset.id=String(f.id);const st=el('td');st.append(el('span','tag'+(f.active?' accent':' off'),f.active?'פעיל':'כבוי'));
  const ans=el('td');const b=el('button','ghost','תשובות');b.type='button';b.dataset.answers=String(f.id);ans.append(b);
  tr.append(cell(f.name),cell(labelOf(f.system_number)),cell(f.trigger==='keyword'?'מילת מפתח "'+f.keyword+'"':TRIGGERS[f.trigger]),cell(nf.format(f.steps.length)),cell(nf.format(f.live)),cell(nf.format(f.answers)),st,ans);body.append(tr);}
 if(!FLOWS.length){const tr=el('tr');const td=cell('עדיין אין תהליכים','muted');td.colSpan=8;tr.append(td);body.append(tr);}}
function smsParts(t){const len=t.replace(/\n/g,'\r\n').length;if(!len)return 0;const uni=/[^\x00-\x7f]/.test(t);return len<=(uni?70:140)?1:Math.ceil(len/(uni?67:134));}
function newStepId(){let n=0;for(const s of BF.steps)n=Math.max(n,Number(s.id.slice(1))||0);return 's'+(n+1);}
function stepLabel(s){const i=BF.steps.indexOf(s);return 'שלב '+(i+1)+(s.text?': '+(s.text.length>28?s.text.slice(0,28)+'…':s.text):'');}
function nextSelect(current,value,onChange){const sel=el('select','opt-next');const end=el('option','','סיום השיחה');end.value='';sel.append(end);
 for(const s of BF.steps)if(s!==current){const o=el('option','',stepLabel(s));o.value=s.id;sel.append(o);}sel.value=value||'';sel.addEventListener('change',function(){onChange(sel.value);});return sel;}
function fieldSelect(value,label,onChange){const l=el('label','row hint');const sel=el('select');const none=el('option','','לא לשמור');none.value='';sel.append(none);for(const f of SETTINGS.contact_fields){const o=el('option','',f.label);o.value=f.id;sel.append(o);}
 sel.value=value||'';sel.addEventListener('change',function(){onChange(sel.value);});l.append(label,sel);return l;}
function renderSteps(){const box=$('bf-steps');box.replaceChildren();
 BF.steps.forEach(function(s,i){const card=el('div','step-card');const head=el('div','step-head');head.append(el('b','','שלב '+(i+1)));
  const type=el('select');for(const t of [['options','שאלה עם תשובות'],['text','שאלה פתוחה'],['end','הודעת סיום']]){const o=el('option','',t[1]);o.value=t[0];type.append(o);}type.value=s.type;
  type.addEventListener('change',function(){s.type=type.value;if(s.type==='options'&&!(s.options&&s.options.length))s.options=[{reply:'1',meaning:'',next:''}];renderSteps();});head.append(type);
  const tools=el('span','end');if(i>0){const up=el('button','icon-btn');up.type='button';up.setAttribute('aria-label','הזזה למעלה');up.append(icon('asc'));up.addEventListener('click',function(){BF.steps.splice(i,1);BF.steps.splice(i-1,0,s);renderSteps();});tools.append(up);}
  if(BF.steps.length>1){const del=el('button','icon-btn');del.type='button';del.setAttribute('aria-label','מחיקת השלב');del.append(icon('trash'));del.addEventListener('click',function(){BF.steps.splice(i,1);for(const o of BF.steps){if(o.next===s.id)o.next='';for(const op of o.options||[])if(op.next===s.id)op.next='';}renderSteps();});tools.append(del);}
  head.append(tools);const ta=el('textarea');ta.rows=2;ta.maxLength=1000;ta.value=s.text;ta.placeholder=s.type==='end'?'ההודעה האחרונה ללקוח':'השאלה ללקוח';const count=el('span','hint');
  const upd=function(){count.textContent=nf.format(s.text.length)+' תווים · '+smsParts(s.text)+' SMS';};ta.addEventListener('input',function(){s.text=ta.value;upd();});ta.addEventListener('change',renderSteps);upd();card.append(head,ta,count);
  if(s.type==='options'){const hd=el('div','opt-row opt-head');hd.append(el('span','','תשובה'),el('span','','משמעות (נשמרת)'),el('span','','השלב הבא'),el('span'));card.append(hd);
   s.options.forEach(function(o,k){const row=el('div','opt-row');const r=el('input');r.value=o.reply;r.maxLength=60;r.placeholder='1';r.setAttribute('aria-label','תשובה');r.addEventListener('input',function(){o.reply=r.value;});
    const m=el('input');m.value=o.meaning;m.maxLength=60;m.placeholder='לדוגמה: מעוניין';m.setAttribute('aria-label','משמעות');m.addEventListener('input',function(){o.meaning=m.value;});
    const x=el('button','icon-btn');x.type='button';x.setAttribute('aria-label','הסרת התשובה');x.append(icon('close'));x.disabled=s.options.length<2;x.addEventListener('click',function(){s.options.splice(k,1);renderSteps();});
    row.append(r,m,nextSelect(s,o.next,function(v){o.next=v;}),x);card.append(row);});
   const add=el('button','ghost');add.type='button';add.append(icon('plus'),'הוספת תשובה');add.disabled=s.options.length>=20;add.addEventListener('click',function(){s.options.push({reply:String(s.options.length+1),meaning:'',next:''});renderSteps();});
   const row=el('div','row');row.append(add,fieldSelect(s.field,'שמירת המשמעות בשדה',function(v){s.field=v;}));card.append(row);}
  else if(s.type==='text'){const row=el('div','row');const l=el('label','row hint');l.append('השלב הבא',nextSelect(s,s.next,function(v){s.next=v;}));row.append(l,fieldSelect(s.field,'שמירת התשובה בשדה',function(v){s.field=v;}));card.append(row);}
  box.append(card);});}
function bfTrigger(t){BF.trigger=t;for(const b of document.querySelectorAll('[data-trigger]'))b.setAttribute('aria-pressed',String(b.dataset.trigger===t));$('bf-keyword').hidden=t!=='keyword';
 $('bf-trigger-hint').textContent=t==='any'?'כל הודעה של לקוח שאינו באמצע שיחה מתחילה את התהליך. רק תהליך פעיל אחד במספר יכול לעבוד כך.':t==='keyword'?'הודעה שהיא מילת המפתח, או שמתחילה בה, מתחילה את התהליך.':'התהליך מתחיל רק כשבוחרים אותו בחלון שליחת הודעה. השלב הראשון נשלח לנמענים, ותשובותיהם ממשיכות את התהליך.';}
function openFlow(id){const f=id?FLOWS.find(function(x){return x.id===id;}):null;BF=f?JSON.parse(JSON.stringify({id:f.id,trigger:f.trigger,steps:f.steps})):{id:null,trigger:'any',steps:[{id:'s1',type:'options',text:'',options:[{reply:'1',meaning:'',next:''},{reply:'2',meaning:'',next:''}]}]};
 for(const s of BF.steps){if(s.type==='options'&&!s.options)s.options=[];}
 $('bf-title').textContent=f?'עריכת תהליך':'תהליך חדש';$('bf-name').value=f?f.name:'';const sel=$('bf-number');sel.replaceChildren();for(const n of NUMBERS){const o=el('option','',n.label+' · '+local(n.number));o.value=n.number;sel.append(o);}if(f)sel.value=f.system_number;
 $('bf-keyword').value=f&&f.keyword||'';$('bf-expire').value=String(f?f.expire_hours:24);$('bf-fallback').value=f?f.fallback:'';$('bf-active').checked=f?!!f.active:false;$('bf-delete').hidden=!f;$('bf-error').hidden=true;
 bfTrigger(BF.trigger);renderSteps();$('bf-dlg').showModal();$('bf-name').focus();}
for(const b of document.querySelectorAll('[data-trigger]'))b.addEventListener('click',function(){bfTrigger(b.dataset.trigger);});
$('bf-add-step').addEventListener('click',function(){if(BF.steps.length>=30)return;BF.steps.push({id:newStepId(),type:'options',text:'',options:[{reply:'1',meaning:'',next:''},{reply:'2',meaning:'',next:''}]});renderSteps();});
$('b-add').addEventListener('click',function(){openFlow(null);});
$('b-rows').addEventListener('click',function(e){const a=e.target.closest('[data-answers]');if(a){openAnswers(Number(a.dataset.answers));return;}const tr=e.target.closest('tr[data-id]');if(tr)openFlow(Number(tr.dataset.id));});
$('b-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.id){e.preventDefault();openFlow(Number(e.target.dataset.id));}});
$('bf-form').addEventListener('submit',async function(e){e.preventDefault();$('bf-error').hidden=true;$('bf-save').disabled=true;
 const steps=BF.steps.map(function(s){return s.type==='end'?{id:s.id,type:'end',text:s.text}:s.type==='text'?{id:s.id,type:'text',text:s.text,next:s.next||'',field:s.field||''}:{id:s.id,type:'options',text:s.text,options:s.options,field:s.field||''};});
 try{const d=await post('/api/admin/flows/save',{id:BF.id,name:$('bf-name').value,system_number:$('bf-number').value,trigger:BF.trigger,keyword:$('bf-keyword').value,steps:steps,fallback:$('bf-fallback').value,expire_hours:Number($('bf-expire').value),active:$('bf-active').checked});
  $('bf-dlg').close();toast(BF.id?'התהליך עודכן':'התהליך נוסף');void d;await loadFlows();}catch(err){dlgError('bf-error',err);}finally{$('bf-save').disabled=false;}});
$('bf-delete').addEventListener('click',async function(){const id=BF.id;$('bf-dlg').close();if(!await confirmAction('מחיקת תהליך','למחוק את התהליך, את השיחות הפעילות בו ואת התשובות שנאספו? ההודעות עצמן לא יימחקו.','מחיקה'))return;
 try{await post('/api/admin/flows/delete',{id:id});toast('התהליך נמחק');await loadFlows();}catch(err){error(err);}});
async function openAnswers(id){const f=FLOWS.find(function(x){return x.id===id;});try{BA={flow:f,answers:(await get('/api/admin/flows/answers?id='+id)).answers};}catch(err){error(err);return;}
 $('ba-title').textContent='תשובות: '+f.name+' ('+nf.format(BA.answers.length)+')';const body=$('ba-rows');body.replaceChildren();
 for(const a of BA.answers.slice(0,1000)){const tr=el('tr');const who=el('td');who.append(el('span','phone',local(a.peer_number)));if(a.contact&&a.contact.name)who.append(el('span','sub-line',a.contact.name));
  const q=el('td');q.append(el('div','mi-body',a.question));tr.append(cell(shortFmt.format(a.at),'muted'),who,q,cell(a.answer),cell(a.meaning||'—',a.meaning?'':'muted'));body.append(tr);}
 if(!BA.answers.length){const tr=el('tr');const td=cell('עדיין אין תשובות','muted');td.colSpan=5;tr.append(td);body.append(tr);}$('ba-dlg').showModal();}
$('ba-export').addEventListener('click',function(){if(!BA)return;const q=function(x){x=String(x==null?'':x);return /[",\r\n]/.test(x)||/^[=+\-@]/.test(x)?'"'+(/^[=+\-@]/.test(x)?"'":'')+x.replace(/"/g,'""')+'"':x;};
 const names=SETTINGS.contact_fields;const head=['זמן','לקוח'].concat(names.map(function(f){return f.label;}),['שאלה','תשובה','משמעות']);
 const lines=[head].concat(BA.answers.map(function(a){return [shortFmt.format(a.at),local(a.peer_number)].concat(names.map(function(f){return a.contact&&a.contact[f.id]||'';}),[a.question,a.answer,a.meaning||'']);}));
 const blob=new Blob([String.fromCharCode(0xfeff)+lines.map(function(r){return r.map(q).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=el('a');a.href=URL.createObjectURL(blob);a.download='bot-answers-'+today()+'.csv';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},20000);});

// Forwarding to webhooks: rules per system number and the recent delivery log.
let FWD={rules:[],deliveries:[],max:10},FW=null;
const FW_STATUS={delivered:['נמסר','good','check'],pending:['ממתין לניסיון נוסף','warn','clock'],failed:['נכשל','bad','x']};
async function loadForwards(){const r=await Promise.all([get('/api/admin/forwards'),get('/api/admin/numbers')]);FWD={rules:r[0].rules,deliveries:r[0].deliveries,max:r[0].max_attempts};NUMBERS=r[1].numbers;renderForwards();}
function hostOf(u){try{return new URL(u).host;}catch(e){return u;}}
function renderForwards(){const body=$('f-rows');body.replaceChildren();
 for(const f of FWD.rules){const tr=el('tr','click');tr.tabIndex=0;tr.dataset.id=String(f.id);const st=el('td');st.append(el('span','tag'+(f.active?'':' off'),f.active?'פעיל':'כבוי'));if(f.failed)st.append(' ',el('span','tag off',plural(f.failed,'משלוח אחד נכשל','משלוחים נכשלו')));if(f.pending)st.append(' ',el('span','tag',plural(f.pending,'אחד ממתין','ממתינים')));
  tr.append(cell(f.name),cell(labelOf(f.system_number)),cell(f.senders.length?plural(f.senders.length,'שולח אחד','שולחים'):'כל השולחים',f.senders.length?'':'muted'),cell(f.url,'url-cell'),cell(f.format==='micropay'?'מיקרופיי':'JSON'),st);body.append(tr);}
 if(!FWD.rules.length){const tr=el('tr');const td=cell('עדיין אין כללי העברה','muted');td.colSpan=6;tr.append(td);body.append(tr);}
 const log=$('fl-rows');log.replaceChildren();const names=new Map(FWD.rules.map(function(f){return [f.id,f.name];}));
 for(const d of FWD.deliveries){const tr=el('tr');const s=FW_STATUS[d.status];const b=el('span','badge '+s[1]);b.append(icon(s[2]),s[0]);const stc=el('td');stc.append(b);if(d.status==='pending'&&d.next_at)stc.append(el('span','sub-line','הניסיון הבא '+clockFmt.format(d.next_at)));
  const last=el('td','muted');last.textContent=(d.last_status?'HTTP '+d.last_status:'')+(d.last_error?(d.last_status?' · ':'')+d.last_error:'')||'—';const act=el('td');
  if(d.status!=='delivered'){const rb=el('button','ghost','שליחה מחדש');rb.type='button';rb.addEventListener('click',function(){resendDelivery(d.id,rb);});act.append(rb);}
  const msg=el('td');msg.append(el('div','mi-body',d.body));tr.append(cell(shortFmt.format(d.created_at),'muted'),cell(names.get(d.rule_id)||'—'),cell(local(d.peer_number),'phone'),msg,stc,cell(nf.format(d.attempts)+' / '+nf.format(FWD.max),'muted'),last,act);log.append(tr);}
 if(!FWD.deliveries.length){const tr=el('tr');const td=cell('עדיין לא נשלחו הודעות','muted');td.colSpan=8;tr.append(td);log.append(tr);}}
function fwFormat(v){FW.format=v;for(const b of document.querySelectorAll('[data-fwformat]'))b.setAttribute('aria-pressed',String(b.dataset.fwformat===v));
 $('fw-format-hint').textContent=v==='json'?'POST עם JSON: event, id, msgid, system_number, system_label, from, body, occurred_at, received_at, contact.':'POST בטופס, בדיוק כמו ה-Webhook של מיקרופיי: origsms, phone, dest, msgid. מתאים למערכת שכבר מקבלת הודעות ממיקרופיי.';}
function openForward(id){const f=id?FWD.rules.find(function(x){return x.id===id;}):null;FW={id:f?f.id:null};$('fw-title').textContent=f?'עריכת כלל העברה':'כלל העברה חדש';
 const sel=$('fw-number');sel.replaceChildren();for(const n of NUMBERS){const o=el('option','',n.label+' · '+local(n.number)+(n.active?'':' (מושבת)'));o.value=n.number;sel.append(o);}if(f)sel.value=f.system_number;
 $('fw-name').value=f?f.name:'';$('fw-url').value=f?f.url:'';$('fw-senders').value=f?f.senders.map(local).join('\n'):'';$('fw-headers').value=f?Object.keys(f.headers).map(function(k){return k+': '+f.headers[k];}).join('\n'):'';
 $('fw-active').checked=f?!!f.active:true;$('fw-secret-row').hidden=!f;$('fw-secret').value=f?f.secret:'';$('fw-delete').hidden=$('fw-test').hidden=!f;fwFormat(f?f.format:'json');$('fw-error').hidden=true;$('fw-dlg').showModal();$('fw-name').focus();}
function fwPayload(){const headers={};for(const line of $('fw-headers').value.split('\n')){const t=line.trim();if(!t)continue;const i=t.indexOf(':');if(i<1)throw new Error('כותרת לא תקינה: '+t);headers[t.slice(0,i).trim()]=t.slice(i+1).trim();}
 const senders=[];for(const v of $('fw-senders').value.split(/[,;\n]+/)){if(!v.trim())continue;const n=normalize(v);if(!n)throw new Error('מספר שולח לא תקין: '+v.trim());senders.push(n);}
 return {id:FW.id,name:$('fw-name').value,system_number:$('fw-number').value,url:$('fw-url').value.trim(),senders:senders,format:FW.format,headers:headers,active:$('fw-active').checked};}
for(const b of document.querySelectorAll('[data-fwformat]'))b.addEventListener('click',function(){fwFormat(b.dataset.fwformat);});
$('f-add').addEventListener('click',function(){openForward(null);});
$('f-rows').addEventListener('click',function(e){const tr=e.target.closest('tr[data-id]');if(tr)openForward(Number(tr.dataset.id));});
$('f-rows').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.dataset.id){e.preventDefault();openForward(Number(e.target.dataset.id));}});
$('fw-form').addEventListener('submit',async function(e){e.preventDefault();$('fw-error').hidden=true;$('fw-save').disabled=true;
 try{const d=await post('/api/admin/forwards/save',fwPayload());toast(FW.id?'הכלל עודכן':'הכלל נוסף');await loadForwards();if(!FW.id)openForward(d.id);else $('fw-dlg').close();}catch(err){dlgError('fw-error',err);}finally{$('fw-save').disabled=false;}});
$('fw-test').addEventListener('click',async function(){const b=this;b.disabled=true;$('fw-error').hidden=true;
 try{const d=await post('/api/admin/forwards/test',{id:FW.id});if(d.ok)toast('הבדיקה עברה: הכתובת ענתה HTTP '+d.status);else dlgError('fw-error',new Error('הבדיקה נכשלה: '+(d.status?'HTTP '+d.status+' · ':'')+(d.error||'')));}catch(err){dlgError('fw-error',err);}finally{b.disabled=false;}});
$('fw-secret-new').addEventListener('click',async function(){if(!await confirmAction('החלפת מפתח החתימה','אחרי ההחלפה הצד המקבל צריך לעבור למפתח החדש, אחרת הוא ידחה את הבקשות.','החלפה'))return;
 try{const d=await post('/api/admin/forwards/secret',{id:FW.id});$('fw-secret').value=d.secret;toast('המפתח הוחלף');await loadForwards();}catch(err){dlgError('fw-error',err);}});
$('fw-delete').addEventListener('click',async function(){const id=FW.id;$('fw-dlg').close();if(!await confirmAction('מחיקת כלל העברה','למחוק את הכלל ואת יומן המשלוחים שלו? הודעות לא יימחקו.','מחיקה'))return;
 try{await post('/api/admin/forwards/delete',{id:id});toast('הכלל נמחק');await loadForwards();}catch(err){error(err);}});
async function resendDelivery(id,b){b.disabled=true;try{const d=await post('/api/admin/forwards/resend',{id:id});toast(d.ok?'נמסר בהצלחה':'השליחה נכשלה שוב'+(d.error?': '+d.error:''));await loadForwards();}catch(err){error(err);b.disabled=false;}}

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
const MAX_FIELDS=20;
function addFieldRow(box){if(box.children.length>=MAX_FIELDS){toast('אפשר להגדיר עד '+MAX_FIELDS+' שדות');return;}const r=fieldRow({id:'f'+Date.now().toString(36),label:''});box.append(r);r.querySelector('input').focus();}
function fieldsFrom(box){return Array.from(box.querySelectorAll('input')).map(function(i){return {id:i.dataset.id,label:i.value.trim()};}).filter(function(f){return f.label;});}
$('s-field-add').addEventListener('click',function(){addFieldRow($('s-fields'));});
// "Manage fields" from the contacts tab (and from the messages page via #fields): only the contact fields are saved.
async function openFields(){try{SETTINGS=await get('/api/admin/settings');}catch(err){error(err);return;}const box=$('fm-fields');box.replaceChildren();for(const f of SETTINGS.contact_fields)box.append(fieldRow(f));
 $('fm-error').hidden=true;$('fm-dlg').showModal();if(!SETTINGS.contact_fields.length)addFieldRow(box);}
$('fm-add').addEventListener('click',function(){addFieldRow($('fm-fields'));});
$('c-fields').addEventListener('click',openFields);
$('fm-form').addEventListener('submit',async function(e){e.preventDefault();$('fm-error').hidden=true;$('fm-save').disabled=true;
 try{SETTINGS=await post('/api/admin/settings',{contact_fields:fieldsFrom($('fm-fields'))});$('fm-dlg').close();toast('השדות נשמרו');if(!$('c-rows').closest('[data-panel]').hidden)await loadContacts();}catch(err){dlgError('fm-error',err);}finally{$('fm-save').disabled=false;}});
async function loadSettings(){SETTINGS=await get('/api/admin/settings');$('s-fields').replaceChildren();for(const f of SETTINGS.contact_fields)$('s-fields').append(fieldRow(f));$('s-org').value=SETTINGS.org_name;$('s-density').value=SETTINGS.default_density;$('s-refresh').value=SETTINGS.refresh_seconds;$('s-max').value=SETTINGS.max_recipients;
 $('s-daily').value=SETTINGS.default_daily_limit;$('s-keywords').value=SETTINGS.optout_keywords.join(', ');$('s-optout').value=SETTINGS.optout_text;$('s-intl').checked=SETTINGS.allow_international;$('s-error').hidden=true;}
$('s-form').addEventListener('submit',async function(e){e.preventDefault();$('s-error').hidden=true;const n=function(id){return Number($(id).value);};
 try{SETTINGS=await post('/api/admin/settings',{org_name:$('s-org').value,default_density:$('s-density').value,refresh_seconds:n('s-refresh'),max_recipients:n('s-max'),default_daily_limit:n('s-daily'),optout_keywords:$('s-keywords').value.split(',').map(function(s){return s.trim();}).filter(Boolean),optout_text:$('s-optout').value,allow_international:$('s-intl').checked,contact_fields:fieldsFrom($('s-fields'))});
  toast('ההגדרות נשמרו');await loadSettings();$('org').textContent=SETTINGS.org_name||'מצב הגשה אינו אישור מסירה';}
 catch(err){dlgError('s-error',err);}});

function details(action,raw){if(!raw)return '';let d;try{d=JSON.parse(raw);}catch(e){return raw;}
 if(action==='send')return (d.test?'בדיקה · ':'')+nf.format(d.recipients)+' נמענים · '+(SEND_STATUS[d.status]||d.status);
 if(action==='export')return (d.format==='csv'?'CSV':'Excel')+' · '+nf.format((d.columns||[]).length)+' עמודות'+(d.filters&&Object.keys(d.filters).length?' · עם סינון':'');
 if(action==='user.disconnect')return d.disable?'נותק והושבת':'נותק';
 if(action==='access.sync')return d.ok?plural(d.emails,'משתמש אחד','משתמשים'):'נכשל: '+d.error;
 if(action==='messages.import')return d.file+' · '+nf.format(d.total)+' שורות';
 if(action==='messages.import.undo')return plural(d.removed,'הודעה אחת הוסרה','הודעות הוסרו');
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

(async function(){try{await loadMe();}catch(e){error(e);return;}const fields=location.hash==='#fields';showTab(fields?'contacts':location.hash.slice(1));if(fields)openFields();})();
`;
export function adminPage(nonce:string):string { return shell(nonce,'ניהול · הודעות SMS',css,body,script); }

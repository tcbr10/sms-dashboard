// The visual builder for bot flows: steps as cards on a canvas, answers as colored chips, lines to the next step.
// It edits the same BF.steps the list editor edits (admin-page.ts); a step's place on the canvas is its optional `pos`.
// Inside the String.raw templates never use backticks or ${.
export const FLOW_CANVAS_CSS = String.raw`
.fc-b{--bg:#E6F1FB;--s:#378ADD;--t:#0C447C;--on:#fff}
.fc-p{--bg:#EEEDFE;--s:#7F77DD;--t:#3C3489;--on:#fff}
.fc-k{--bg:#F1EFE8;--s:#888780;--t:#444441;--on:#fff}
.fc-g{--bg:#EAF3DE;--s:#639922;--t:#27500A;--on:#fff}
.fc-c0{--s:#639922;--on:#fff}.fc-c1{--s:#D85A30;--on:#fff}.fc-c2{--s:#BA7517;--on:#fff}.fc-c3{--s:#7F77DD;--on:#fff}.fc-c4{--s:#378ADD;--on:#fff}
@media (prefers-color-scheme:dark){
.fc-b{--bg:#0C447C;--s:#85B7EB;--t:#B5D4F4;--on:#1a1a18}
.fc-p{--bg:#3C3489;--s:#AFA9EC;--t:#CECBF6;--on:#1a1a18}
.fc-k{--bg:#444441;--s:#B4B2A9;--t:#D3D1C7;--on:#1a1a18}
.fc-g{--bg:#27500A;--s:#97C459;--t:#C0DD97;--on:#1a1a18}
.fc-c0{--s:#97C459;--on:#1a1a18}.fc-c1{--s:#F0997B;--on:#1a1a18}.fc-c2{--s:#EF9F27;--on:#1a1a18}.fc-c3{--s:#AFA9EC;--on:#1a1a18}.fc-c4{--s:#85B7EB;--on:#1a1a18}}
.fc-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.fc-bar .fc-add{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 12px;border:0;border-radius:999px;background:var(--bg);color:var(--t);font-weight:600;font-size:12.5px;cursor:pointer}
.fc-bar .end{margin-inline-start:auto}
.fc-view{position:relative;height:min(62vh,540px);overflow:auto;direction:ltr;border:1px solid var(--line);border-radius:14px;background-color:var(--page);background-image:radial-gradient(var(--line) 1px,transparent 1.2px);background-size:20px 20px}
.fc-stage{position:relative;min-width:100%;min-height:100%}
#fc-edges{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.fc-node,.fc-start{position:absolute;width:190px;direction:rtl}
.fc-node{background:var(--field);border:1px solid var(--bg);border-radius:14px;box-shadow:var(--shadow)}
.fc-node:focus-within{border-color:var(--s)}
.fc-node.fc-lost{border-style:dashed;border-color:var(--s)}
.fc-hd{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:13px 13px 0 0;background:var(--s);color:var(--on);font-size:12px;font-weight:600;cursor:grab;touch-action:none;user-select:none;white-space:nowrap}
.fc-hd:active{cursor:grabbing}
.fc-hd .i{width:15px;height:15px;flex:none}
.fc-hd select{width:auto;min-height:24px;max-width:96px;min-width:0;padding:0 4px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.fc-hd select option{color:var(--ink);background:var(--field)}
.fc-hd .fc-tag{font-weight:500;font-size:11px;opacity:.9}
.fc-hd .end{margin-inline-start:auto;display:flex}
.fc-hd button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
.fc-hd button:hover{background:rgba(255,255,255,.25)}
.fc-bd{padding:8px 8px 10px;background:var(--bg);border-radius:0 0 13px 13px}
.fc-text{display:block;width:100%;min-height:52px;padding:6px 9px;border:0;border-radius:12px 12px 12px 3px;background:var(--field);color:var(--ink);font:inherit;font-size:12.5px;line-height:1.45;resize:none;overflow:hidden}
.fc-count{margin-top:3px;font-size:11px;color:var(--t)}
.fc-chips{display:flex;flex-wrap:wrap;gap:18px 6px;margin-top:9px;padding-bottom:12px}
.fc-chip{position:relative;display:inline-flex;align-items:center;height:26px;padding-inline:4px 2px;border-radius:999px;background:var(--s);color:var(--on)}
.fc-chip input{width:7ch;min-height:0;height:22px;padding:0 4px;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:600;text-align:center}
.fc-chip input::placeholder{color:inherit;opacity:.7}
.fc-chip input:focus-visible{outline:2px solid var(--on);outline-offset:-2px;border-radius:999px}
.fc-chip .fc-x{display:grid;place-items:center;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.8;cursor:pointer}
.fc-chip .fc-x:hover{opacity:1;background:rgba(255,255,255,.25)}
.fc-chip .fc-x .i{width:12px;height:12px}
.fc-plus{display:inline-grid;place-items:center;width:26px;height:26px;padding:0;border:1.5px dashed var(--s);border-radius:50%;background:transparent;color:var(--t);cursor:pointer}
.fc-plus .i{width:14px;height:14px}
.fc-port{position:absolute;left:50%;bottom:-14px;width:12px;height:12px;margin-left:-6px;border:2.5px solid var(--s);border-radius:50%;background:var(--field);cursor:crosshair;touch-action:none}
.fc-port.on{background:var(--s)}
.fc-next{position:relative;margin-top:8px;padding-bottom:6px;font-size:11px;color:var(--t);text-align:center}
.fc-next .fc-port{bottom:-17px}
.fc-start{display:flex;align-items:center;gap:6px;justify-content:center;height:34px;border-radius:999px;background:var(--s);color:var(--on);font-size:12px;font-weight:600;padding:0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-start .i{width:15px;height:15px;flex:none}
.fc-hint{margin:6px 2px 0;font-size:12px;color:var(--muted)}
.fc-wrap{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:10px;margin-top:8px}
.fc-side{display:grid;grid-template-rows:auto minmax(0,1fr);gap:8px;height:min(62vh,540px);padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.fc-side-body{overflow:auto;display:grid;gap:8px;align-content:start;padding-bottom:4px}
.fc-side h4{margin:0;font-size:13px}
.fc-f{display:grid;gap:3px;font-size:12px;color:var(--muted)}
.fc-f textarea,.fc-f input,.fc-f select{width:100%}
.fc-opt{display:grid;gap:6px;padding:8px;border:1px solid var(--line);border-inline-start:4px solid var(--s);border-radius:10px}
.fc-opt-hd{display:flex;align-items:center;gap:6px;font-size:12.5px}
.fc-sel{border:2px solid var(--s)}
.fc-sim{display:grid;gap:6px;align-content:start;--bg:var(--hover);--t:var(--ink);--s:var(--accent);--on:#fff}
.fc-m{max-width:88%;padding:6px 10px;border-radius:12px;font-size:12.5px;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}
.fc-m.bot{justify-self:start;background:var(--bg);color:var(--t);border-radius:12px 12px 12px 3px}
.fc-m.me{justify-self:end;background:var(--s);color:var(--on);border-radius:12px 12px 3px 12px}
.fc-m.note{justify-self:center;background:transparent;color:var(--muted);font-size:11.5px}
.fc-reply{display:flex;flex-wrap:wrap;gap:6px;padding-top:6px;border-top:1px solid var(--line)}
.fc-reply .fc-ans{height:28px;padding:0 12px;border:0;border-radius:999px;background:var(--s);color:var(--on);font-weight:600;font-size:12.5px;cursor:pointer}
.fc-reply input{flex:1;min-width:0}
@media (max-width:760px){.fc-view-toggle{display:none}}
`;
export const FLOW_CANVAS_JS = String.raw`
// Flow canvas. State lives in BF (admin-page.ts); a card is drawn from a step and written back on every edit.
const FC_W=190,FC_GAP_X=36,FC_GAP_Y=210,FC_KIND={options:{cls:'fc-b',icon:'question',label:'שאלה'},text:{cls:'fc-p',icon:'edit',label:'תשובה חופשית'},end:{cls:'fc-k',icon:'check',label:'סיום'}};
const FC_START={any:'הלקוח שולח הודעה',keyword:'הלקוח שולח את מילת המפתח',send:'נשלח מהלוח',external:'הלקוח עונה להודעה מהמערכת האחרת'};
let fcZ=1,FC_SIDE='edit',FC_HOT={},SIM=null;
function fcTargets(s){return s.type==='options'?(s.options||[]).map(function(o){return o.next;}).filter(Boolean):s.type==='text'&&s.next?[s.next]:[];}
function fcReachable(){const seen={};const byId={};for(const s of BF.steps)byId[s.id]=s;const q=[BF.steps[0]];seen[BF.steps[0].id]=true;
 while(q.length){const s=q.shift();for(const id of fcTargets(s))if(byId[id]&&!seen[id]){seen[id]=true;q.push(byId[id]);}}return seen;}
// Steps in rows by distance from the first step; steps nothing leads to go in a last row.
function fcLayout(){const byId={},level={},rows=[];for(const s of BF.steps)byId[s.id]=s;
 const q=[BF.steps[0]];level[BF.steps[0].id]=0;
 while(q.length){const s=q.shift();(rows[level[s.id]]=rows[level[s.id]]||[]).push(s);for(const id of fcTargets(s))if(byId[id]&&level[id]===undefined){level[id]=level[s.id]+1;q.push(byId[id]);}}
 const lost=BF.steps.filter(function(s){return level[s.id]===undefined;});if(lost.length)rows.push(lost);
 const widest=Math.max.apply(null,rows.map(function(r){return r.length;}));
 rows.forEach(function(r,i){const off=(widest-r.length)*(FC_W+FC_GAP_X)/2;r.forEach(function(s,k){s.pos={x:Math.round(24+off+k*(FC_W+FC_GAP_X)),y:70+i*FC_GAP_Y};});});}
function fcSvg(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;}
function fcPoint(e,stage){const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function fcCurve(x1,y1,x2,y2){const my=Math.max(40,Math.abs(y2-y1)/2);return 'M'+x1+' '+y1+'C'+x1+' '+(y1+my)+','+x2+' '+(y2-my)+','+x2+' '+(y2-3);}
function fcDraw(){const svg=$('fc-edges'),stage=$('fc-stage'),sr=stage.getBoundingClientRect();svg.replaceChildren();
 function line(x1,y1,node,col,key){const hot=FC_HOT[key],dim=Object.keys(FC_HOT).length?.3:.85;const t=node.getBoundingClientRect();const x2=t.left+t.width/2-sr.left,y2=t.top-sr.top;
  svg.append(fcSvg('path',{d:fcCurve(x1,y1,x2,y2),fill:'none',stroke:col,'stroke-width':hot?3.4:2.2,'stroke-linecap':'round',opacity:hot?1:dim}));
  svg.append(fcSvg('path',{d:'M'+(x2-5)+' '+(y2-10)+'L'+x2+' '+(y2-3)+'L'+(x2+5)+' '+(y2-10),fill:'none',stroke:col,'stroke-width':hot?3.4:2.2,'stroke-linecap':'round','stroke-linejoin':'round',opacity:hot?1:dim}));}
 const start=$('fc-start'),first=document.querySelector('.fc-node[data-id="'+BF.steps[0].id+'"]');
 if(start&&first){const r=start.getBoundingClientRect();line(r.left+r.width/2-sr.left,r.bottom-sr.top,first,getComputedStyle(start).getPropertyValue('--s'),'start');}
 for(const p of document.querySelectorAll('#fc-nodes .fc-port[data-next]')){const to=document.querySelector('.fc-node[data-id="'+p.dataset.next+'"]');if(!to)continue;
  const r=p.getBoundingClientRect();line(r.left+r.width/2-sr.left,r.top+r.height/2-sr.top,to,getComputedStyle(p).getPropertyValue('--s'),p.dataset.step+'>'+p.dataset.next);}}
// Sizes the stage to the cards and lets the message boxes grow with their text.
function fcFit(){let w=0,h=0;for(const t of document.querySelectorAll('#fc-nodes textarea')){t.style.height='auto';t.style.height=Math.max(52,t.scrollHeight)+'px';}
 for(const n of document.querySelectorAll('#fc-nodes .fc-node')){w=Math.max(w,n.offsetLeft+n.offsetWidth);h=Math.max(h,n.offsetTop+n.offsetHeight);}
 const stage=$('fc-stage');stage.style.width=(w+80)+'px';stage.style.height=(h+80)+'px';fcDraw();}
function fcRemove(s){BF.steps.splice(BF.steps.indexOf(s),1);for(const o of BF.steps){if(o.next===s.id)o.next='';for(const op of o.options||[])if(op.next===s.id)op.next='';}}
function fcAdd(type,x,y){if(BF.steps.length>=30)return null;
 const s={id:newStepId(),type:type,text:'',pos:{x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))}};
 if(type==='options')s.options=[{reply:'1',meaning:'',next:''},{reply:'2',meaning:'',next:''}];if(type==='text'){s.next='';s.field='';}return s;}
function fcFreeSpot(){let y=70;for(const s of BF.steps)if(s.pos)y=Math.max(y,s.pos.y+FC_GAP_Y);return {x:24,y:y};}
function fcSetType(s,type){s.type=type;if(type==='options'&&!(s.options&&s.options.length))s.options=[{reply:'1',meaning:'',next:''},{reply:'2',meaning:'',next:''}];renderSteps();}
function fcPort(cls,next){const p=el('span','fc-port '+cls);if(next){p.dataset.next=next;p.classList.add('on');}return p;}
function fcNode(s,i,reach){const kind=FC_KIND[s.type];const node=el('div','fc-node '+kind.cls+(reach[s.id]?'':' fc-lost')+(BF.sel===s.id?' fc-sel':''));node.dataset.id=s.id;node.style.left=s.pos.x+'px';node.style.top=s.pos.y+'px';
 const hd=el('div','fc-hd');hd.append(icon(kind.icon));
 const type=el('select');type.setAttribute('aria-label','סוג השלב');for(const t of ['options','text','end']){const o=el('option','',FC_KIND[t].label);o.value=t;type.append(o);}type.value=s.type;type.addEventListener('change',function(){fcSetType(s,type.value);});
 hd.append(el('span','','שלב '+(i+1)),type);if(!reach[s.id])hd.append(el('span','fc-tag','לא מחובר'));
 const tools=el('span','end');if(BF.steps.length>1){const del=el('button');del.type='button';del.setAttribute('aria-label','מחיקת השלב');del.append(icon('trash'));del.addEventListener('click',function(){fcRemove(s);renderSteps();});tools.append(del);}hd.append(tools);
 const ext=BF.trigger==='external'&&i===0;const bd=el('div','fc-bd');const ta=el('textarea','fc-text');ta.maxLength=1000;ta.value=s.text;ta.rows=2;
 ta.placeholder=ext?'נוסח השאלה שנשלחה (לא חובה)':s.type==='end'?'ההודעה האחרונה ללקוח':'ההודעה ללקוח';ta.setAttribute('aria-label','נוסח השלב');
 const count=el('div','fc-count');const upd=function(){count.textContent=ta.value?nf.format(ta.value.length)+' תווים · '+smsParts(ta.value)+' SMS':'';};
 ta.addEventListener('input',function(){s.text=ta.value;upd();fcFit();});ta.addEventListener('change',fcPanel);upd();bd.append(ta,count);
 if(s.type==='options'){const chips=el('div','fc-chips');
  s.options.forEach(function(o,k){const chip=el('span','fc-chip fc-c'+(k%5));const inp=el('input');inp.value=o.reply;inp.maxLength=60;inp.placeholder=String(k+1);inp.setAttribute('aria-label','תשובה');inp.style.width=Math.min(14,Math.max(4,o.reply.length+1))+'ch';
   inp.addEventListener('input',function(){o.reply=inp.value;inp.style.width=Math.min(14,Math.max(4,inp.value.length+1))+'ch';});inp.addEventListener('change',fcPanel);
   chip.append(inp);if(s.options.length>1){const x=el('button','fc-x');x.type='button';x.setAttribute('aria-label','הסרת התשובה');x.append(icon('close'));x.addEventListener('click',function(){s.options.splice(k,1);renderSteps();});chip.append(x);}
   const port=fcPort('',o.next);port.dataset.step=s.id;port.dataset.opt=String(k);port.title='גרירה אל שלב לחיבור. לחיצה כפולה מנתקת.';chip.append(port);chips.append(chip);});
  if(s.options.length<20){const add=el('button','fc-plus');add.type='button';add.setAttribute('aria-label','הוספת תשובה');add.append(icon('plus'));add.addEventListener('click',function(){s.options.push({reply:String(s.options.length+1),meaning:'',next:''});renderSteps();});chips.append(add);}
  bd.append(chips);}
 node.append(hd,bd);
 if(s.type==='text'){const nx=el('div','fc-next fc-c4','השלב הבא');const port=fcPort('',s.next);port.dataset.step=s.id;port.title='גרירה אל שלב לחיבור. לחיצה כפולה מנתקת.';nx.append(port);bd.append(nx);}
 return node;}
function renderCanvas(){const nodes=$('fc-nodes');nodes.replaceChildren();
 if(BF.steps.every(function(s){return !s.pos;}))fcLayout();else for(const s of BF.steps)if(!s.pos)s.pos=fcFreeSpot();
 const reach=fcReachable();BF.steps.forEach(function(s,i){nodes.append(fcNode(s,i,reach));});
 const first=BF.steps[0];const start=el('div','fc-start fc-g');start.id='fc-start';start.append(icon('chat'),FC_START[BF.trigger]||'');start.style.left=first.pos.x+'px';start.style.top=Math.max(8,first.pos.y-52)+'px';nodes.append(start);
 if(!BF.steps.some(function(s){return s.id===BF.sel;}))BF.sel=BF.steps[0].id;for(const n of nodes.querySelectorAll('.fc-node'))n.classList.toggle('fc-sel',n.dataset.id===BF.sel);
 fcPanel();fcFit();requestAnimationFrame(fcFit);}
function renderSteps(){if(BF.view==='canvas')renderCanvas();else renderList();}
function bfView(v){BF.view=v;BF.sel=null;FC_HOT={};fcTabs('edit');$('bf-canvas').hidden=v!=='canvas';$('bf-steps').hidden=v!=='list';$('bf-list-add').hidden=v!=='list';
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===v));renderSteps();}
// Dragging a card by its header moves it.
$('fc-nodes').addEventListener('pointerdown',function(e){const hd=e.target.closest('.fc-hd');if(!hd||e.target.closest('select,button')||e.button)return;
 const node=hd.parentElement,s=BF.steps.find(function(x){return x.id===node.dataset.id;});if(!s)return;e.preventDefault();hd.setPointerCapture(e.pointerId);node.style.zIndex=String(++fcZ);
 const sx=e.clientX,sy=e.clientY,ox=s.pos.x,oy=s.pos.y;
 const move=function(ev){s.pos={x:Math.max(0,Math.round(ox+ev.clientX-sx)),y:Math.max(0,Math.round(oy+ev.clientY-sy))};node.style.left=s.pos.x+'px';node.style.top=s.pos.y+'px';
  if(s===BF.steps[0]){const st=$('fc-start');st.style.left=s.pos.x+'px';st.style.top=Math.max(8,s.pos.y-52)+'px';}fcDraw();};
 const up=function(){hd.removeEventListener('pointermove',move);hd.removeEventListener('pointerup',up);hd.removeEventListener('pointercancel',up);fcFit();};
 hd.addEventListener('pointermove',move);hd.addEventListener('pointerup',up);hd.addEventListener('pointercancel',up);});
// Dragging from an answer's dot: onto a card connects it, onto empty canvas starts a new step there.
$('fc-nodes').addEventListener('pointerdown',function(e){const port=e.target.closest('.fc-port');if(!port||e.button)return;
 const s=BF.steps.find(function(x){return x.id===port.dataset.step;});if(!s)return;e.preventDefault();e.stopPropagation();port.setPointerCapture(e.pointerId);
 const stage=$('fc-stage'),svg=$('fc-edges'),r=port.getBoundingClientRect(),sr=stage.getBoundingClientRect();const x1=r.left+r.width/2-sr.left,y1=r.top+r.height/2-sr.top;
 const col=getComputedStyle(port).getPropertyValue('--s');const temp=fcSvg('path',{fill:'none',stroke:col,'stroke-width':2.2,'stroke-dasharray':'5 4','stroke-linecap':'round'});svg.append(temp);
 const move=function(ev){const p=fcPoint(ev,stage);temp.setAttribute('d','M'+x1+' '+y1+'C'+x1+' '+(y1+50)+','+p.x+' '+(p.y-50)+','+p.x+' '+p.y);};
 const done=function(ev){port.removeEventListener('pointermove',move);port.removeEventListener('pointerup',done);port.removeEventListener('pointercancel',cancel);temp.remove();
  const over=document.elementFromPoint(ev.clientX,ev.clientY),node=over&&over.closest('.fc-node');let id=null;
  if(node&&node.dataset.id!==s.id)id=node.dataset.id;
  else if(!node&&over&&over.closest('#fc-stage')){const p=fcPoint(ev,stage),n=fcAdd('options',p.x-FC_W/2,p.y);if(n){BF.steps.push(n);id=n.id;}}
  if(id===null)return;if(s.type==='options')s.options[Number(port.dataset.opt)].next=id;else s.next=id;renderSteps();};
 const cancel=function(){port.removeEventListener('pointermove',move);port.removeEventListener('pointerup',done);port.removeEventListener('pointercancel',cancel);temp.remove();};
 port.addEventListener('pointermove',move);port.addEventListener('pointerup',done);port.addEventListener('pointercancel',cancel);});
$('fc-nodes').addEventListener('dblclick',function(e){const port=e.target.closest('.fc-port');if(!port)return;const s=BF.steps.find(function(x){return x.id===port.dataset.step;});if(!s)return;
 if(s.type==='options')s.options[Number(port.dataset.opt)].next='';else s.next='';renderSteps();});
for(const b of document.querySelectorAll('[data-fc-add]'))b.addEventListener('click',function(){const at=fcFreeSpot(),n=fcAdd(b.dataset.fcAdd,at.x,at.y);if(!n)return;BF.steps.push(n);renderSteps();
 const v=$('fc-view');v.scrollTo({top:Math.max(0,n.pos.y-40),behavior:'smooth'});});
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',function(){bfView(b.dataset.view);});
$('fc-layout').addEventListener('click',function(){fcLayout();renderSteps();});
window.addEventListener('resize',function(){if(BF&&BF.view==='canvas'&&$('bf-dlg').open)fcDraw();});

// Side column: edit the selected step, or try the flow the way a customer would.
function fcTabs(tab){FC_SIDE=tab;$('fc-edit').hidden=tab!=='edit';$('fc-test').hidden=tab!=='test';for(const b of document.querySelectorAll('[data-side]'))b.setAttribute('aria-pressed',String(b.dataset.side===tab));}
function fcField(label,control){const l=el('label','fc-f');l.append(el('span','',label),control);return l;}
function fcSelect(id){if(BF.sel===id)return;BF.sel=id;for(const n of document.querySelectorAll('#fc-nodes .fc-node'))n.classList.toggle('fc-sel',n.dataset.id===id);if(FC_SIDE==='test')fcSimStart(id);else fcPanel();}
function fcPanel(){if(FC_SIDE==='test'){fcSimRender();return;}
 const box=$('fc-edit');box.replaceChildren();const s=BF.steps.find(function(x){return x.id===BF.sel;});if(!s)return;
 box.append(el('h4','','שלב '+(BF.steps.indexOf(s)+1)+' · '+FC_KIND[s.type].label));
 if(s.type==='options'){
  s.options.forEach(function(o,k){const card=el('div','fc-opt fc-c'+(k%5));const hd=el('div','fc-opt-hd');hd.append(el('b','','תשובה '+(o.reply||String(k+1))));card.append(hd);
   const m=el('input');m.value=o.meaning;m.maxLength=60;m.placeholder='לדוגמה: מעוניין';m.addEventListener('input',function(){o.meaning=m.value;});
   const say=el('textarea');say.rows=2;say.maxLength=1000;say.value=o.say||'';say.placeholder='מה הבוט עונה לתשובה הזו';say.addEventListener('input',function(){o.say=say.value;});
   card.append(fcField('משמעות (נשמרת)',m),fcField('תגובת הבוט (לא חובה)',say),fcField('ואז',nextSelect(s,o.next,function(v){o.next=v;renderSteps();})));box.append(card);});
  box.append(el('p','hint','תגובה לתשובה נשלחת מיד, במקום הטקסט של השלב הבא. בלי תגובה נשלח הטקסט של השלב הבא.'),fieldSelect(s.field,'שמירת המשמעות בשדה',function(v){s.field=v;}));}
 else if(s.type==='text'){box.append(fcField('השלב הבא',nextSelect(s,s.next,function(v){s.next=v;renderSteps();})),fieldSelect(s.field,'שמירת התשובה בשדה',function(v){s.field=v;}));}
 else box.append(el('p','hint','הודעה אחרונה: השיחה נסגרת אחריה.'));
 if(BF.trigger==='external'&&BF.steps.indexOf(s)===0)box.append(el('p','hint','השלב הראשון מחכה לתשובת הלקוח להודעה שנשלחה ממערכת אחרת. נוסח השאלה לא חובה, והוא נשלח רק כשהתשובה לא מזוהה.'));}
function fcSimStart(id){const s=BF.steps.find(function(x){return x.id===id;})||BF.steps[0];SIM={cur:s.id,log:[]};FC_HOT=s===BF.steps[0]?{start:1}:{};
 SIM.log.push(s.text?{who:'bot',text:s.text}:{who:'note',text:'השאלה הראשונה נשלחת ממערכת אחרת'});fcSimRender();fcDraw();}
function fcSimStep(){return SIM&&BF.steps.find(function(x){return x.id===SIM.cur;});}
function fcSimGo(from,nextId,say,me){SIM.log.push({who:'me',text:me});const next=BF.steps.find(function(x){return x.id===nextId;});if(nextId)FC_HOT[from.id+'>'+nextId]=1;
 if(next){SIM.log.push({who:'bot',text:say||next.text||'(אין נוסח לשלב)'});SIM.cur=next.type==='end'?null:next.id;}else{if(say)SIM.log.push({who:'bot',text:say});SIM.cur=null;}
 fcSimRender();fcDraw();}
function fcSimRender(){const box=$('fc-test');box.replaceChildren();if(!SIM)return fcSimStart(BF.sel);
 const log=el('div','fc-sim');for(const m of SIM.log)log.append(el('div','fc-m '+m.who,m.text));box.append(log);
 const s=fcSimStep(),rep=el('div','fc-reply');
 if(s&&s.type==='options')s.options.forEach(function(o,k){const b=el('button','fc-ans fc-c'+(k%5),o.reply.split(',')[0].trim()||String(k+1));b.type='button';b.addEventListener('click',function(){fcSimGo(s,o.next,(o.say||'').trim(),b.textContent);});rep.append(b);});
 else if(s&&s.type==='text'){const inp=el('input');inp.maxLength=200;inp.placeholder='תשובת הלקוח';const b=el('button','fc-ans fc-c4','שליחה');b.type='button';const send=function(){if(inp.value.trim())fcSimGo(s,s.next,'',inp.value.trim());};b.addEventListener('click',send);inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();send();}});rep.append(inp,b);}
 else{log.append(el('div','fc-m note','השיחה הסתיימה'));}
 const again=el('button','ghost','התחלה מחדש');again.type='button';again.addEventListener('click',function(){fcSimStart(BF.sel);});rep.append(again);box.append(rep);}
for(const b of document.querySelectorAll('[data-side]'))b.addEventListener('click',function(){fcTabs(b.dataset.side);if(b.dataset.side==='test')fcSimStart(BF.sel);else{FC_HOT={};fcPanel();fcDraw();}});
$('fc-nodes').addEventListener('pointerdown',function(e){const n=e.target.closest('.fc-node');if(n)fcSelect(n.dataset.id);});
$('fc-nodes').addEventListener('focusin',function(e){const n=e.target.closest('.fc-node');if(n)fcSelect(n.dataset.id);});
`;

const BIZ_ROW_H=44;

// ══════════════════════════════════════════════════════════════════════════════
// ISSUE 4 FIX — Undo stack
// A single-level undo is sufficient (undo last destructive action).
// _bizUndo holds a deep clone of the full biz state taken BEFORE each delete.
// undoBizAction() restores it, then clears the stack so it can't be used twice.
// ══════════════════════════════════════════════════════════════════════════════
let _bizUndo=null;   // { snapshot, label }

function pushBizUndo(label){
  // Deep-clone via JSON round-trip — safe because biz only contains primitives
  _bizUndo={snapshot:JSON.parse(JSON.stringify(getBiz())),label};
}

function undoBizAction(){
  if(!_bizUndo){showToast('Nothing to undo');return;}
  saveBiz(_bizUndo.snapshot);
  showToast(`↩ Undone: ${_bizUndo.label}`);
  _bizUndo=null;
  // Hide undo button after use
  const btn=document.getElementById('biz-undo-btn');
  if(btn)btn.style.display='none';
  renderBusiness();
}

function showUndoButton(label){
  let btn=document.getElementById('biz-undo-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='biz-undo-btn';
    btn.style.cssText='background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.4);border-radius:7px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;transition:opacity .3s';
    btn.addEventListener('click',undoBizAction);
    const topbar=document.querySelector('.biz-topbar');
    if(topbar)topbar.appendChild(btn);
  }
  btn.textContent=`↩ Undo (${label})`;
  btn.style.display='inline-flex';
  // Auto-hide after 6 seconds
  clearTimeout(btn._t);
  btn._t=setTimeout(()=>{btn.style.display='none';_bizUndo=null;},6000);
}


// Month-based storage (from previous fix session)
function bizMonthKey(){
  const base=new Date();
  base.setDate(base.getDate()+bizWeekOffset*7);
  return`tf_biz_${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
}
function bizPrevMonthKey(){
  const base=new Date();
  base.setDate(base.getDate()+bizWeekOffset*7);
  base.setMonth(base.getMonth()-1);
  return`tf_biz_${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
}

function defaultBiz(){
  return{
    employees:[
      {id:1,name:'Alice Johnson',role:'Designer',color:EMP_COLORS[0],initials:'AJ'},
      {id:2,name:'Bob Smith',role:'Developer',color:EMP_COLORS[1],initials:'BS'},
      {id:3,name:'Cora Lee',role:'Manager',color:EMP_COLORS[2],initials:'CL'},
      {id:4,name:'Dan Kim',role:'Marketing',color:EMP_COLORS[3],initials:'DK'},
    ],
    shifts:[
      {id:1,empId:1,start:9,end:17,label:'Design Sprint'},
      {id:2,empId:2,start:10,end:18,label:'Dev Work'},
      {id:3,empId:3,start:8,end:16,label:'Management'},
      {id:4,empId:4,start:11,end:17,label:'Campaign'},
    ],
    nextId:5,nextEmpId:5
  };
}
function getBiz(){
  try{return JSON.parse(localStorage.getItem(bizMonthKey()))||defaultBiz();}catch{return defaultBiz();}
}
function saveBiz(b){localStorage.setItem(bizMonthKey(),JSON.stringify(b));}

function copyFromPrevMonth(){
  let prev;
  try{prev=JSON.parse(localStorage.getItem(bizPrevMonthKey()));}catch{prev=null;}
  if(!prev||!prev.employees.length){showToast('No data found for previous month');return;}
  const biz=getBiz();
  let added=0;
  prev.employees.forEach(emp=>{
    if(!biz.employees.find(e=>e.name===emp.name)){
      biz.employees.push({...emp,id:biz.nextEmpId++,color:EMP_COLORS[biz.employees.length%EMP_COLORS.length]});
      added++;
    }
  });
  saveBiz(biz);renderBusiness();
  showToast(added?`✓ Copied ${added} employee${added!==1?'s':''} from last month`:'All employees already present');
}

function setBizViewMode(mode){
  bizViewMode=mode;
  document.querySelectorAll('[data-biz-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.bizView===mode));
  renderBusiness();
}
function bizRangeLabel(){
  const base=new Date();base.setDate(base.getDate()+bizWeekOffset*(bizViewMode==='year'?365:bizViewMode==='month'?30:7));
  if(bizViewMode==='week'){const s=new Date(base);s.setDate(base.getDate()-base.getDay());const en=new Date(s);en.setDate(s.getDate()+6);return`${s.toLocaleDateString('en',{month:'short',day:'numeric'})} – ${en.toLocaleDateString('en',{month:'short',day:'numeric'})}`;}
  if(bizViewMode==='month')return base.toLocaleDateString('en',{month:'long',year:'numeric'});
  return base.getFullYear().toString();
}
function bizChangeWeek(n){bizWeekOffset+=n;renderBusiness();}

// ══════════════════════════════════════════════════════════════════════════════
// ISSUE 3 FIX — Remove confirmation dialogs
// Root cause: deleteShift() and deleteEmp() called confirm(), which blocks the
// thread and shows a native browser modal the user cannot style or dismiss
// quickly. Fix: remove both confirm() guards entirely. Undo (Issue 4) provides
// the safety net in their place.
// ══════════════════════════════════════════════════════════════════════════════
function deleteShift(id,e){
  e.stopPropagation();
  const biz=getBiz();
  const sh=biz.shifts.find(s=>s.id===id);
  if(!sh)return;
  // FIX: snapshot BEFORE mutation so undo can restore exactly
  pushBizUndo(`shift "${sh.label}"`);
  biz.shifts=biz.shifts.filter(s=>s.id!==id);
  saveBiz(biz);
  renderBusiness();
  showToast('Shift removed');beep('delete');
  showUndoButton(`shift "${sh.label}"`);
}

function renderBusiness(){
  const biz=getBiz();
  const el=document.getElementById('emp-list');if(!el)return;el.innerHTML='';
  biz.employees.forEach(emp=>{
    const hrs=biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0);
    const item=document.createElement('div');item.className='emp-sidebar-item';
    item.innerHTML=`<div class="emp-sb-av" style="background:${emp.color}">${emp.initials}</div><div class="emp-sb-info"><div class="emp-sb-name">${emp.name}</div><div class="emp-sb-role">${emp.role}</div></div><div class="emp-sb-hrs">${hrs}h</div><div class="emp-edit-row"><button class="emp-edit-btn" onclick="editEmp(${emp.id},event)" title="Edit">✏️</button><button class="emp-edit-btn" onclick="deleteEmp(${emp.id},event)" title="Delete">🗑</button></div>`;
    el.appendChild(item);
  });
  const allShifts=biz.shifts;
  document.getElementById('bs-shifts').textContent=allShifts.length;
  document.getElementById('bs-hours').textContent=allShifts.reduce((s,sh)=>s+(sh.end-sh.start),0)+'h';
  document.getElementById('bs-emp').textContent=biz.employees.length;
  let conflicts=0;biz.employees.forEach(emp=>{const arr=allShifts.filter(s=>s.empId===emp.id).sort((a,b)=>a.start-b.start);for(let i=1;i<arr.length;i++)if(arr[i].start<arr[i-1].end)conflicts++;});
  const ce=document.getElementById('bs-conf');ce.textContent=conflicts;ce.style.color=conflicts?'#EF4444':'var(--accent)';
  document.getElementById('biz-week-label').textContent=bizRangeLabel();

  // Custom hours + copy-last-month controls
  let ctrlBar=document.getElementById('biz-hour-ctrl');
  if(!ctrlBar){
    const topbar=document.querySelector('.biz-topbar');
    if(topbar){
      ctrlBar=document.createElement('div');ctrlBar.id='biz-hour-ctrl';
      ctrlBar.style.cssText='display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);flex-wrap:wrap;';
      ctrlBar.innerHTML=`
        <span style="font-weight:600">Hours:</span>
        <select id="biz-start-h" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:2px 4px;font-size:11px"></select>
        <span>–</span>
        <select id="biz-end-h" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:2px 4px;font-size:11px"></select>
        <button onclick="copyFromPrevMonth()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer;font-weight:600">📋 Copy Last Month</button>
      `;
      topbar.appendChild(ctrlBar);
      const startSel=ctrlBar.querySelector('#biz-start-h');
      const endSel=ctrlBar.querySelector('#biz-end-h');
      for(let h=0;h<24;h++){
        const lbl=typeof fmt12h==='function'?fmt12h(h):`${h}:00`;
        startSel.innerHTML+=`<option value="${h}"${h===bizStartH?' selected':''}>${lbl}</option>`;
        endSel.innerHTML+=`<option value="${h+1}"${h+1===bizEndH?' selected':''}>${typeof fmt12h==='function'?fmt12h(h+1===24?0:h+1):`${h+1}:00`}</option>`;
      }
      startSel.addEventListener('change',()=>{bizStartH=parseInt(startSel.value,10);if(bizStartH>=bizEndH)bizEndH=Math.min(24,bizStartH+1);renderBusiness();});
      endSel.addEventListener('change',()=>{bizEndH=parseInt(endSel.value,10);if(bizEndH<=bizStartH)bizStartH=Math.max(0,bizEndH-1);renderBusiness();});
    }
  }else{
    const startSel=document.getElementById('biz-start-h');
    const endSel=document.getElementById('biz-end-h');
    if(startSel)startSel.value=bizStartH;
    if(endSel)endSel.value=bizEndH;
  }

  const wrap=document.getElementById('biz-grid-wrap');const grid=document.getElementById('biz-grid');
  if(bizViewMode==='week'){renderBusinessWeek(grid,biz);setTimeout(()=>{if(wrap)wrap.scrollTop=Math.max(0,(bizStartH)*BIZ_ROW_H+40-60);},80);}
  else if(bizViewMode==='month'){renderBusinessMonth(grid,biz);if(wrap)wrap.scrollTop=0;}
  else{renderBusinessYear(grid,biz);if(wrap)wrap.scrollTop=0;}
}

function renderBusinessWeek(bizGrid,biz){
  bizGrid.innerHTML='<div class="biz-tc" id="biz-tc"></div>';
  const tc=bizGrid.querySelector('#biz-tc');
  const hdr=document.createElement('div');hdr.className='biz-tc-hdr';tc.appendChild(hdr);
  for(let h=bizStartH;h<bizEndH;h++){
    const lbl=document.createElement('div');lbl.className='biz-tc-lbl';
    lbl.textContent=typeof fmt12h==='function'?fmt12h(h):`${h}:00`;
    lbl.style.top=((h-bizStartH)*BIZ_ROW_H+40)+'px';
    tc.appendChild(lbl);
  }
  biz.employees.forEach(emp=>{
    const col=document.createElement('div');col.className='emp-col';
    const ch=document.createElement('div');ch.className='emp-col-hdr';
    const addBtn=document.createElement('button');addBtn.className='emp-col-add-btn';addBtn.textContent='+';addBtn.title='Add shift';
    addBtn.addEventListener('click',ev=>{ev.stopPropagation();showAddShiftModal(emp.id);});
    ch.innerHTML=`<div class="emp-hdr-av" style="background:${emp.color}">${emp.initials}</div><div><div class="emp-hdr-name">${emp.name.split(' ')[0]}</div><div class="emp-hdr-role">${emp.role}</div></div>`;
    ch.appendChild(addBtn);col.appendChild(ch);
    for(let h=bizStartH;h<bizEndH;h++){
      const row=document.createElement('div');row.className='biz-row-bg';
      row.style.top=((h-bizStartH)*BIZ_ROW_H+40)+'px';col.appendChild(row);
    }
    biz.shifts.filter(s=>s.empId===emp.id).forEach(sh=>{
      if(sh.end<=bizStartH||sh.start>=bizEndH)return;
      const dispStart=Math.max(sh.start,bizStartH);
      const dispEnd=Math.min(sh.end,bizEndH);
      const overlap=biz.shifts.filter(s2=>s2.empId===emp.id&&s2.id!==sh.id&&sh.start<s2.end&&sh.end>s2.start).length>0;
      const shEl=document.createElement('div');shEl.className='biz-shift'+(overlap?' conflict':'');shEl.dataset.shiftId=sh.id;
      shEl.style.cssText=`top:${(dispStart-bizStartH)*BIZ_ROW_H+40}px;height:${(dispEnd-dispStart)*BIZ_ROW_H-4}px;background:${emp.color};color:#000`;
      const timeLabel=typeof fmt12hRange==='function'?fmt12hRange(sh.start,sh.end):`${sh.start}:00–${sh.end}:00`;
      shEl.innerHTML=`
        <div class="biz-shift-label">${sh.label}</div>
        <div class="biz-shift-time">${timeLabel}</div>
        <button class="biz-shift-del-btn" onclick="deleteShift(${sh.id},event)" title="Remove shift"
          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.35);color:#fff;border:none;border-radius:4px;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      `;
      bindShiftDrag(shEl,sh,emp.id);
      col.appendChild(shEl);
    });
    bizGrid.appendChild(col);
  });
}

function bindShiftDrag(el,shift,empId){
  let startY=0,startTop=0;
  const onMove=ev=>{
    const p=getEventPoint(ev);
    const delta=Math.round((p.clientY-startY)/BIZ_ROW_H);
    const dur=shift.end-shift.start;
    const nextStart=Math.max(bizStartH,Math.min(bizEndH-dur,startTop+delta));
    shift.start=nextStart;shift.end=nextStart+dur;
    el.style.top=((shift.start-bizStartH)*BIZ_ROW_H+40)+'px';
    const timeEl=el.querySelector('.biz-shift-time');
    if(timeEl)timeEl.textContent=typeof fmt12hRange==='function'?fmt12hRange(shift.start,shift.end):`${shift.start}:00–${shift.end}:00`;
  };
  const onUp=()=>{
    saveBiz(getBiz());renderBusiness();
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    document.removeEventListener('touchmove',onMove);document.removeEventListener('touchend',onUp);
  };
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('biz-shift-del-btn'))return;
    startY=e.clientY;startTop=shift.start;
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
  el.addEventListener('touchstart',e=>{
    if(e.target.classList.contains('biz-shift-del-btn'))return;
    const p=getEventPoint(e);startY=p.clientY;startTop=shift.start;
    document.addEventListener('touchmove',onMove,{passive:false});document.addEventListener('touchend',onUp);
  },{passive:true});
}

function renderBusinessMonth(bizGrid,biz){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  bizGrid.innerHTML=`<div class="biz-summary-grid month">${days.map(d=>`<div class="biz-day-card"><div class="biz-day-title">${d}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0)}h</strong></div>`).join('')}</div>`).join('')}</div>`;
}
function renderBusinessYear(bizGrid,biz){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  bizGrid.innerHTML=`<div class="biz-summary-grid year">${months.map(m=>`<div class="biz-month-card"><div class="biz-month-title">${m}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).length}</strong></div>`).join('')}</div>`).join('')}</div>`;
}

function editEmp(id,e){
  e.stopPropagation();const biz=getBiz();const emp=biz.employees.find(x=>x.id===id);if(!emp)return;
  showModal({title:'Edit Employee',body:`<label class="tf-label">Name</label><input class="tf-input" id="en" value="${escHtml(emp.name)}"/><label class="tf-label">Role</label><input class="tf-input" id="er" value="${escHtml(emp.role)}"/>`,btn:'Save',onConfirm:()=>{
    emp.name=document.getElementById('en').value.trim()||emp.name;
    emp.role=document.getElementById('er').value.trim()||emp.role;
    emp.initials=emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    saveBiz(biz);renderBusiness();return true;
  }});
}

// ISSUE 3 FIX — confirm() removed; undo provides the safety net
function deleteEmp(id,e){
  e.stopPropagation();
  const biz=getBiz();
  const emp=biz.employees.find(x=>x.id===id);
  if(!emp)return;
  // Snapshot BEFORE mutation
  pushBizUndo(`employee "${emp.name}"`);
  biz.employees=biz.employees.filter(x=>x.id!==id);
  biz.shifts=biz.shifts.filter(s=>s.empId!==id);
  saveBiz(biz);renderBusiness();
  showToast(`${emp.name} removed`);beep('delete');
  showUndoButton(`employee "${emp.name}"`);
}

function showAddEmpModal(){
  showModal({title:'Add Employee',body:`<label class="tf-label">Full Name</label><input class="tf-input" id="ename" placeholder="e.g. Sarah Connor"/><label class="tf-label">Role</label><input class="tf-input" id="erole" placeholder="e.g. Designer"/>`,btn:'Add Employee',onConfirm:()=>{
    const name=document.getElementById('ename').value.trim();const role=document.getElementById('erole').value.trim();
    if(!name){showToast('Enter a name');return false;}
    const biz=getBiz();const color=EMP_COLORS[biz.employees.length%EMP_COLORS.length];
    biz.employees.push({id:biz.nextEmpId++,name,role:role||'Staff',color,initials:name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()});
    saveBiz(biz);renderBusiness();showToast(`${name} added ✓`);return true;
  }});
}

function showAddShiftModal(empId){
  const biz=getBiz();const emp=biz.employees.find(x=>x.id===empId);if(!emp)return;
  const opts=(from,to)=>Array.from({length:to-from+1},(_,i)=>{const h=from+i;const l=typeof fmt12h==='function'?fmt12h(h===24?0:h):`${h}:00`;return`<option value="${h}">${l}</option>`;}).join('');
  showModal({
    title:`Add Shift — ${emp.name}`,
    body:`
      <label class="tf-label">Shift Label</label>
      <input class="tf-input" id="sh-label" placeholder="e.g. Morning Shift"/>
      <label class="tf-label">Start Time</label>
      <select class="tf-input" id="sh-start">${opts(bizStartH,bizEndH-1)}</select>
      <label class="tf-label">End Time</label>
      <select class="tf-input" id="sh-end">${opts(bizStartH+1,bizEndH)}</select>
    `,
    btn:'Add Shift',
    onConfirm:()=>{
      const label=document.getElementById('sh-label').value.trim()||'Shift';
      const start=parseInt(document.getElementById('sh-start').value,10);
      const end=parseInt(document.getElementById('sh-end').value,10);
      if(isNaN(start)||isNaN(end)||end<=start){showToast('End must be after start');return false;}
      biz.shifts.push({id:biz.nextId++,empId,start,end,label});
      saveBiz(biz);renderBusiness();showToast(`Shift added for ${emp.name} ✓`);return true;
    }
  });
}

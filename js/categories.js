function renderCategoriesView(){
  const grid=document.getElementById('cat-view-grid');grid.innerHTML='';
  const blocks=getBlocks();
  const catH={};CATEGORIES.forEach(c=>catH[c.id]=0);
  blocks.forEach(b=>{if(b.catId)catH[b.catId]=(catH[b.catId]||0)+b.durationH;});
  const maxH=Math.max(...Object.values(catH),.01);
  CATEGORIES.forEach(cat=>{
    const h=catH[cat.id]||0;
    const card=document.createElement('div');card.className='cat-view-card';
    card.innerHTML=`<div class="cat-view-emoji">${cat.emoji}</div><div class="cat-view-name">${cat.name}</div><div class="cat-view-hours">${h>0?h.toFixed(1)+'h today':'No blocks today'}</div><div class="cat-view-bar"><div class="cat-view-fill" style="width:${(h/maxH*100)}%;background:${cat.color}"></div></div>`;
    card.addEventListener('click',()=>{
      switchView('home');
      // Set filter (future feature) 
    });
    grid.appendChild(card);
  });
}


function getDates(){return gs('DATES')||[
  {id:'d1',title:"Alex's Birthday",date:'2025-05-15',desc:'Don\'t forget to wish him!',emoji:'🎂',color:0,pinned:true},
  {id:'d2',title:'Project Deadline',date:'2025-06-01',desc:'Final submission',emoji:'📋',color:1,pinned:false},
  {id:'d3',title:'Team Meeting',date:'2025-04-30',desc:'Monthly review',emoji:'📅',color:2,pinned:false},
]}
function saveDates(ds){ss('DATES',ds);document.getElementById('nb-dates').textContent=ds.filter(d=>d.pinned).length||'';document.getElementById('nb-dates').style.display=ds.filter(d=>d.pinned).length?'':'none';}
function renderDates(){
  const grid=document.getElementById('dates-grid');grid.innerHTML='';
  const dates=getDates().sort((a,b)=>b.pinned-a.pinned);
  // Add button
  const addCard=document.createElement('div');addCard.className='add-date-card';
  addCard.innerHTML='<div class="add-date-icon">+</div><div class="add-date-text">Add Important Date</div>';
  addCard.addEventListener('click',showAddDateModal);grid.appendChild(addCard);
  dates.forEach(d=>{
    const card=document.createElement('div');card.className='date-card'+(d.pinned?' pinned':'');
    card.style.background=DATE_CARD_COLORS[d.color%DATE_CARD_COLORS.length];
    card.style.border='1px solid rgba(255,255,255,.1)';
    const dObj=new Date(d.date);const dStr=dObj.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
    card.innerHTML=`<div class="date-card-top"><div class="date-card-emoji">${d.emoji}</div></div><div class="date-card-title">${escHtml(d.title)}</div><div class="date-card-date">${dStr}</div>${d.desc?`<div class="date-card-desc">${escHtml(d.desc)}</div>`:''}
    <div class="date-card-actions">
      <button class="date-action-btn" title="Pin" onclick="toggleDatePin('${d.id}',event)">${d.pinned?'📍':'📌'}</button>
      <button class="date-action-btn" title="Edit" onclick="editDateModal('${d.id}',event)">✏️</button>
      <button class="date-action-btn" title="Delete" onclick="deleteDate('${d.id}',event)" style="background:rgba(239,68,68,.3)">🗑</button>
    </div>`;
    grid.appendChild(card);
  });
}
function toggleDatePin(id,e){e.stopPropagation();const ds=getDates();const d=ds.find(x=>x.id===id);if(d)d.pinned=!d.pinned;saveDates(ds);renderDates();}
function deleteDate(id,e){e.stopPropagation();const ds=getDates().filter(x=>x.id!==id);saveDates(ds);renderDates();}
function showAddDateModal(){
  showModal({title:'Add Important Date',body:`<label class="tf-label">Title</label><input class="tf-input" id="dt-title" placeholder="e.g. Alex's Birthday"/><label class="tf-label">Date</label><input class="tf-input" id="dt-date" type="date"/><label class="tf-label">Emoji</label><input class="tf-input" id="dt-emoji" placeholder="🎂" maxlength="2"/><label class="tf-label">Description (optional)</label><input class="tf-input" id="dt-desc" placeholder="Short note…"/>`,btn:'Add Date',onConfirm:()=>{
    const title=document.getElementById('dt-title').value.trim();
    const date=document.getElementById('dt-date').value;
    const emoji=document.getElementById('dt-emoji').value.trim()||'📅';
    const desc=document.getElementById('dt-desc').value.trim();
    if(!title||!date){showToast('Title and date required');return false;}
    const ds=getDates();
    ds.push({id:'d'+Date.now(),title,date,emoji,desc,color:Math.floor(Math.random()*DATE_CARD_COLORS.length),pinned:false});
    saveDates(ds);renderDates();return true;
  }});
}
function editDateModal(id,e){
  e.stopPropagation();const ds=getDates();const d=ds.find(x=>x.id===id);if(!d)return;
  showModal({title:'Edit Date',body:`<label class="tf-label">Title</label><input class="tf-input" id="dt-title" value="${escHtml(d.title)}"/><label class="tf-label">Date</label><input class="tf-input" id="dt-date" type="date" value="${d.date}"/><label class="tf-label">Emoji</label><input class="tf-input" id="dt-emoji" value="${d.emoji}" maxlength="2"/><label class="tf-label">Description</label><input class="tf-input" id="dt-desc" value="${escHtml(d.desc||'')}"/>`,btn:'Save Changes',onConfirm:()=>{
    d.title=document.getElementById('dt-title').value.trim()||d.title;
    d.date=document.getElementById('dt-date').value||d.date;
    d.emoji=document.getElementById('dt-emoji').value.trim()||d.emoji;
    d.desc=document.getElementById('dt-desc').value.trim();
    saveDates(ds);renderDates();return true;
  }});
}


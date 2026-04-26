let _bid=0; let selectedBlock=null;
let _gridDropSetup=false;
const isMobileDevice=()=>window.innerWidth<=768;

// ════════════════════════════════════════════════════════════════════
// BUG FIX 3 — Text line break persistence
// Root cause: .textContent strips HTML including <br> tags that
// contentEditable inserts. We must save/restore innerHTML instead,
// but sanitise it to only allow safe formatting tags.
// ════════════════════════════════════════════════════════════════════
function _sanitizeBlockHtml(html){
  // Allow only: <br>, <b>, <i>, <u>, <span style="...">
  // Strip everything else to prevent XSS while keeping line breaks
  return (html||'')
    .replace(/<br\s*\/?>/gi,'[[BR]]')
    .replace(/<\/?b>/gi,'[[B]]')
    .replace(/<\/?i>/gi,'[[I]]')
    .replace(/<\/?u>/gi,'[[U]]')
    .replace(/<[^>]*>/g,'')           // strip all other tags
    .replace(/\[\[BR\]\]/g,'<br>')
    .replace(/\[\[B\]\]/g,'<b>')
    .replace(/\[\[I\]\]/g,'</b>')
    .replace(/\[\[U\]\]/g,'<u>');
}

// ════════════════════════════════════════════════════════════════════
// BUG FIX 4 — Text overflow / block-text visibility
// Root cause: max-height:calc(var(--row-h) - 40px) in CSS clips text
// when block spans multiple hours. We store blockData per-element and
// the text div gets flex:1 so it fills available space.
// ════════════════════════════════════════════════════════════════════
function getBlocks(){
  return Array.from(document.querySelectorAll('#grid-area .block')).map(b=>({
    hex:b.dataset.hex, catId:b.dataset.cat||'',
    // FIX: save innerHTML to preserve <br> line breaks
    text:(b.querySelector('.block-text')||{}).innerHTML||'',
    startH:(parseFloat(b.style.top)||0)/ROW_H,
    durationH:Math.round(((parseFloat(b.style.height)||b.offsetHeight)+6)/ROW_H),
    done:b.dataset.done==='1',
    // Media attachments
    media:b.dataset.media?JSON.parse(b.dataset.media):[],
    emoji:b.dataset.emoji||'',
    fontSize:b.dataset.fontSize||'12',
  }));
}

function saveWS(){
  const blocks=Array.from(document.querySelectorAll('#grid-area .block')).map(b=>({
    id:b.dataset.bid, hex:b.dataset.hex, fg:b.dataset.fg,
    catId:b.dataset.cat||'', name:b.dataset.name||'',
    // FIX: innerHTML not textContent — preserves <br> line breaks
    text:(b.querySelector('.block-text')||{}).innerHTML||'',
    left:parseFloat(b.style.left)||0, top:parseFloat(b.style.top)||0,
    width:parseFloat(b.style.width)||210,
    height:parseFloat(b.style.height)||b.offsetHeight,
    done:b.dataset.done==='1',
    media:b.dataset.media?JSON.parse(b.dataset.media):[],
    emoji:b.dataset.emoji||'',
    fontSize:b.dataset.fontSize||'12',
  }));
  localStorage.setItem(wsKey(currentDate),JSON.stringify(blocks));
  updateCatSidePanel();
  if(window.TF_PROFILE?.shareSchedule&&typeof syncScheduleNow==='function') syncScheduleNow();
}

function loadWS(ds){
  document.querySelectorAll('#grid-area .block').forEach(b=>b.remove());
  selectBlock(null);
  try{
    const blocks=JSON.parse(localStorage.getItem(wsKey(ds)))||[];
    blocks.forEach(b=>{
      const col=BLOCK_COLORS.find(c=>c.hex===b.hex)||{hex:b.hex||'#38BDF8',fg:b.fg||'#0C1A2E',name:b.name||''};
      createBlock(b.left,b.top,b.text,col,b.catId||'',b.width,b.height,b.id,b.done,b.media||[],b.emoji||'',b.fontSize||'12');
    });
  }catch(e){}
  updateCatSidePanel();
}

function hasOverlap(y,h,ex=null){
  for(const b of document.querySelectorAll('#grid-area .block')){
    if(b===ex)continue;
    const bY=parseFloat(b.style.top)||0, bH=parseFloat(b.style.height)||b.offsetHeight;
    if(y<bY+bH&&y+h>bY)return true;
  }return false;
}
function findFreeSlot(y,h,ex=null){
  let sy=snapY(y); if(!hasOverlap(sy,h,ex))return sy;
  let d=sy; while(d+h<=24*ROW_H){d+=ROW_H;if(!hasOverlap(d,h,ex))return d;}
  let u=sy; while(u>0){u-=ROW_H;if(u>=0&&!hasOverlap(u,h,ex))return u;}
  return sy;
}

// ════════════════════════════════════════════════════════════════════
// FEATURE 1 & 2 — Media + customisation
// media array: [{type:'img'|'sticker'|'gif', src, x, y, w, h, id}]
// emoji: single emoji overlay displayed top-right of block
// ════════════════════════════════════════════════════════════════════
function _renderMedia(block,mediaArr){
  // Remove existing media layer
  block.querySelector('.block-media-layer')?.remove();
  if(!mediaArr||!mediaArr.length)return;
  const layer=document.createElement('div');
  layer.className='block-media-layer';
  mediaArr.forEach(m=>{
    const el=document.createElement('img');
    el.src=m.src; el.draggable=false;
    el.className='block-media-item';
    el.style.cssText=`left:${m.x||0}px;top:${m.y||0}px;width:${m.w||60}px;height:${m.h||60}px;`;
    el.dataset.mid=m.id;
    // Delete on double-tap/double-click
    el.addEventListener('dblclick',e=>{
      e.stopPropagation();
      const arr=JSON.parse(block.dataset.media||'[]');
      block.dataset.media=JSON.stringify(arr.filter(x=>x.id!==m.id));
      _renderMedia(block,JSON.parse(block.dataset.media));
      saveWS();
    });
    // Drag to reposition
    _bindMediaDrag(el,m,block);
    layer.appendChild(el);
  });
  block.appendChild(layer);
}

function _bindMediaDrag(el,m,block){
  let sx=0,sy=0,ox=0,oy=0;
  el.addEventListener('mousedown',e=>{
    if(e.button!==0)return; e.stopPropagation(); e.preventDefault();
    sx=e.clientX; sy=e.clientY; ox=m.x||0; oy=m.y||0;
    const mm=ev=>{
      m.x=ox+(ev.clientX-sx); m.y=oy+(ev.clientY-sy);
      el.style.left=m.x+'px'; el.style.top=m.y+'px';
    };
    const mu=()=>{
      // update dataset
      const arr=JSON.parse(block.dataset.media||'[]');
      const idx=arr.findIndex(x=>x.id===m.id);
      if(idx>-1){arr[idx].x=m.x;arr[idx].y=m.y;block.dataset.media=JSON.stringify(arr);}
      saveWS();
      document.removeEventListener('mousemove',mm);
      document.removeEventListener('mouseup',mu);
    };
    document.addEventListener('mousemove',mm);
    document.addEventListener('mouseup',mu);
  });
}

function _addMediaToBlock(block,src,type='img'){
  const arr=JSON.parse(block.dataset.media||'[]');
  arr.push({id:'m'+Date.now(),type,src,x:10,y:10,w:60,h:60});
  block.dataset.media=JSON.stringify(arr);
  _renderMedia(block,arr);
  saveWS();
}

// ════════════════════════════════════════════════════════════════════
// createBlock — master function
// ════════════════════════════════════════════════════════════════════
function createBlock(x,y,text,color,catId,w,h,id,done,media,emoji,fontSize){
  const c=color||BLOCK_COLORS[0];
  const bH=h||(ROW_H-6); const bW=w||210;
  const freeY=hasOverlap(y,bH)?findFreeSlot(y,bH):y;
  _bid++; const bid=id||`b${_bid}`;
  const cat=CAT_MAP[catId]||null;
  const mediaArr=media||[]; const emojiVal=emoji||''; const fs=fontSize||'12';

  const block=document.createElement('div');
  block.className='block'+(done?' completed':'');
  block.dataset.bid=bid; block.dataset.hex=c.hex; block.dataset.fg=c.fg;
  block.dataset.name=c.name||''; block.dataset.cat=catId||'';
  block.dataset.done=done?'1':'0';
  block.dataset.media=JSON.stringify(mediaArr);
  block.dataset.emoji=emojiVal;
  block.dataset.fontSize=fs;
  block.style.cssText=`left:${x}px;top:${freeY}px;width:${bW}px;height:${bH}px;background:${c.hex};color:${c.fg}`;

  // Header
  const hdr=document.createElement('div'); hdr.className='block-header';
  const dot=document.createElement('div'); dot.className='block-cat-dot'; dot.style.background=cat?cat.color:'rgba(255,255,255,.3)';
  const catLbl=document.createElement('div'); catLbl.className='block-cat-label'; catLbl.textContent=cat?cat.name:'';
  const chk=document.createElement('div'); chk.className='block-check'+(done?' done':''); chk.textContent=done?'✓':''; chk.title='Mark complete (+pts)';
  chk.addEventListener('click',e=>{e.stopPropagation();toggleBlockDone(block,chk);});
  hdr.appendChild(dot); hdr.appendChild(catLbl); hdr.appendChild(chk);

  // Emoji overlay
  if(emojiVal){
    const emojiEl=document.createElement('div'); emojiEl.className='block-emoji-overlay';
    emojiEl.textContent=emojiVal; block.appendChild(emojiEl);
  }

  // BUG FIX 3+4: use innerHTML for restore, flex:1 for full-height text
  const txt=document.createElement('div'); txt.className='block-text';
  txt.contentEditable='true';
  txt.dataset.ph='What are you doing?';
  txt.style.color=c.fg;
  txt.style.fontSize=fs+'px';
  // FIX: set innerHTML (not textContent) to restore <br> line breaks
  if(text) txt.innerHTML=_sanitizeBlockHtml(text);
  txt.addEventListener('mousedown',e=>e.stopPropagation());
  txt.addEventListener('input',()=>saveWS());
  // FIX: also save on blur to catch paste events
  txt.addEventListener('blur',()=>saveWS());

  const btn=document.createElement('button'); btn.className='block-menu-btn'; btn.textContent='⋯'; btn.style.color=c.fg;
  btn.addEventListener('click',e=>{e.stopPropagation();openBlockDD(block,btn);beep('click');});

  // Resize bottom — tall and grippy
  const rb=document.createElement('div'); rb.className='block-resize-b';
  rb.innerHTML='<span class="resize-grip">⠿</span>';
  rb.addEventListener('mousedown',e=>{e.stopPropagation();resizeBlockH(e,block);});

  const rr=document.createElement('div'); rr.className='block-resize-r';
  rr.addEventListener('mousedown',e=>{e.stopPropagation();resizeBlockW(e,block);});

  // +1h button — shown on all devices
  const mobExt=document.createElement('button'); mobExt.className='block-mobile-extend';
  mobExt.textContent='+1h'; mobExt.title='Add 1 hour';
  mobExt.addEventListener('click',e=>{
    e.stopPropagation();
    const curH=Math.round(((parseFloat(block.style.height)||block.offsetHeight)+6)/ROW_H);
    setBlockDuration(block,Math.min(curH+1,12));
    beep('click');
  });

  block.appendChild(hdr); block.appendChild(txt); block.appendChild(btn);
  block.appendChild(rb); block.appendChild(rr); block.appendChild(mobExt);

  // Render media on top
  if(mediaArr.length) _renderMedia(block,mediaArr);

  block.addEventListener('mousedown',e=>{
    if([btn,rb,rr,chk,mobExt].some(el=>e.target===el||e.target.closest?.('.block-media-layer,.block-emoji-overlay'))) return;
    if(e.target===txt||e.target.closest('.block-text')) return;
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      const cl=createBlock(x+20,findFreeSlot(freeY+ROW_H,bH),txt.innerHTML,c,catId,bW,bH,null,false,mediaArr,emojiVal,fs);
      saveWS(); dragBlock(e,cl); return;
    }
    selectBlock(block); dragBlock(e,block);
  });

  document.getElementById('grid-area').appendChild(block);
  if(!text&&!isMobileDevice()) setTimeout(()=>txt.focus(),40);
  bindBlockTouchInteractions(block,txt,rb,rr,mobExt);
  return block;
}

function toggleBlockDone(block,chk){
  const isDone=block.dataset.done==='1';
  block.dataset.done=isDone?'0':'1';
  block.classList.toggle('completed',!isDone);
  chk.classList.toggle('done',!isDone);
  chk.textContent=!isDone?'✓':'';
  if(!isDone){checkDayStreak();beep('complete');const pts=awardPoints(50,null,null);showToast(`✅ +${pts} pts`);addNotif('✅','Task completed!');}
  saveWS();
}

function selectBlock(el){
  if(selectedBlock&&selectedBlock!==el)selectedBlock.classList.remove('selected');
  selectedBlock=el; if(el)el.classList.add('selected');
}
function applyBlockColor(block,c){
  block.style.background=c.hex; block.style.color=c.fg;
  block.dataset.hex=c.hex; block.dataset.fg=c.fg; block.dataset.name=c.name||'';
  const txt=block.querySelector('.block-text'); const btn=block.querySelector('.block-menu-btn');
  if(txt)txt.style.color=c.fg; if(btn)btn.style.color=c.fg;
}
function applyBlockCat(block,catId){
  block.dataset.cat=catId; const cat=CAT_MAP[catId];
  const dot=block.querySelector('.block-cat-dot'); const lbl=block.querySelector('.block-cat-label');
  if(dot)dot.style.background=cat?cat.color:'rgba(255,255,255,.3)';
  if(lbl)lbl.textContent=cat?cat.name:'';
}

document.addEventListener('keydown',e=>{
  if((e.key==='Delete'||e.key==='Backspace')&&selectedBlock&&!document.activeElement.isContentEditable&&document.activeElement.tagName!=='INPUT'){
    beep('delete'); selectedBlock.remove(); selectedBlock=null; saveWS();
  }
  if(e.key==='Escape'){selectBlock(null);closeDD();}
});
document.getElementById('grid-area')?.addEventListener('mousedown',e=>{
  if(e.target.id==='grid-area'||e.target.classList.contains('grid-row'))selectBlock(null);
});

function dragBlock(e,block){
  e.preventDefault();
  const grid=document.getElementById('grid-area'), br=block.getBoundingClientRect();
  const ox=e.clientX-br.left, oy=e.clientY-br.top, origH=block.offsetHeight;
  block.classList.add('dragging'); block.style.zIndex=100;
  const onMove=ev=>{
    const gr=grid.getBoundingClientRect();
    block.style.left=Math.max(0,ev.clientX-gr.left-ox)+'px';
    block.style.top=Math.max(0,ev.clientY-gr.top-oy)+'px';
    const snappedTop=snapY(parseFloat(block.style.top));
    document.querySelectorAll('.grid-row.drop-hl').forEach(r=>r.classList.remove('drop-hl'));
    const rows=document.querySelectorAll('.grid-row'); const row=Math.floor((ev.clientY-gr.top)/ROW_H);
    if(rows[row])rows[row].classList.add('drop-hl');
    block.classList.toggle('conflict',hasOverlap(snappedTop,origH,block));
    block.classList.toggle('valid',!hasOverlap(snappedTop,origH,block));
  };
  const onUp=()=>{
    block.classList.remove('dragging','valid','conflict'); block.style.zIndex='';
    document.querySelectorAll('.grid-row.drop-hl').forEach(r=>r.classList.remove('drop-hl'));
    block.style.top=findFreeSlot(parseFloat(block.style.top)||0,origH,block)+'px';
    saveWS();
    document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
  };
  document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
}
function resizeBlockH(e,block){
  e.preventDefault(); const sy=e.clientY, sh=block.offsetHeight;
  const onMove=ev=>{ block.style.height=Math.max(ROW_H-6,sh+(ev.clientY-sy))+'px'; };
  const onUp=()=>{block.style.height=(Math.max(1,Math.round(block.offsetHeight/ROW_H))*ROW_H-6)+'px';saveWS();document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
  document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
}
function resizeBlockW(e,block){
  e.preventDefault(); const sx=e.clientX, sw=block.offsetWidth;
  const onMove=ev=>{ block.style.width=Math.max(130,sw+(ev.clientX-sx))+'px'; };
  const onUp=()=>{saveWS();document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
  document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
}

function bindBlockTouchInteractions(block,txt,rb,rr,mobExt){
  let start=null, mode=null, pressTimer=null, resizeStartH=0;
  const clearPress=()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}};
  block.addEventListener('touchstart',e=>{
    if([rb,rr,mobExt].some(el=>e.target===el)||e.target.closest('.block-text,.block-check,.block-menu-btn,.block-media-layer'))return;
    const pt=getEventPoint(e); start={x:pt.clientX,y:pt.clientY,left:parseFloat(block.style.left)||0,top:parseFloat(block.style.top)||0};
    selectBlock(block); mode='pending';
    pressTimer=setTimeout(()=>{mode='resize-touch';resizeStartH=block.offsetHeight;block.classList.add('resizing-touch');navigator.vibrate&&navigator.vibrate(12);},450);
  },{passive:true});
  block.addEventListener('touchmove',e=>{
    if(!start)return; const pt=getEventPoint(e); const dx=pt.clientX-start.x,dy=pt.clientY-start.y;
    if(Math.abs(dx)>8||Math.abs(dy)>8)clearPress();
    if(mode==='pending')mode=Math.abs(dx)>Math.abs(dy)+18?'swipe':'drag';
    if(mode==='swipe'){e.preventDefault();block.style.transform=`translateX(${dx}px)`;block.style.opacity=Math.max(.2,1-Math.abs(dx)/160);}
    else if(mode==='resize-touch'){e.preventDefault();const newH=Math.max(ROW_H-6,resizeStartH+dy);block.style.height=(Math.max(1,Math.round(newH/ROW_H))*ROW_H-6)+'px';}
    else if(mode==='drag'){e.preventDefault();block.style.left=Math.max(0,start.left+dx)+'px';block.style.top=Math.max(0,start.top+dy)+'px';}
  },{passive:false});
  block.addEventListener('touchend',e=>{
    if(!start)return; clearPress(); const pt=getEventPoint(e); const dx=pt.clientX-start.x;
    if(mode==='swipe'&&Math.abs(dx)>110){beep('delete');if(selectedBlock===block)selectedBlock=null;block.remove();saveWS();showToast('Block deleted');}
    else if(mode==='resize-touch'){block.classList.remove('resizing-touch');block.style.height=(Math.max(1,Math.round(block.offsetHeight/ROW_H))*ROW_H-6)+'px';block.style.top=findFreeSlot(parseFloat(block.style.top)||0,block.offsetHeight,block)+'px';saveWS();}
    else if(mode==='drag'){block.style.top=findFreeSlot(parseFloat(block.style.top)||0,block.offsetHeight,block)+'px';saveWS();}
    block.style.transform='';block.style.opacity='';start=null;mode=null;
  });
}

// ════════════════════════════════════════════════════════════════════
// MOBILE ADD SHEET
// ════════════════════════════════════════════════════════════════════
let _mobSelectedColor=BLOCK_COLORS[0], _mobSelectedCatId='', _mobSelectedDur=1;

function showMobileAddSheet(hour){
  const sel=document.getElementById('mob-hour'); sel.innerHTML='';
  for(let h=0;h<24;h++){
    const opt=document.createElement('option'); opt.value=h; opt.textContent=fmt12h(h);
    if(h===(hour??new Date().getHours()))opt.selected=true;
    sel.appendChild(opt);
  }
  _mobSelectedDur=1;
  document.querySelectorAll('.mob-dur-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.h)===1));
  const cr=document.getElementById('mob-color-row'); cr.innerHTML='';
  BLOCK_COLORS.forEach(col=>{
    const s=document.createElement('div'); s.className='mob-color-swatch'+(col.hex===_mobSelectedColor.hex?' selected':'');
    s.style.background=col.hex;
    s.addEventListener('click',()=>{_mobSelectedColor=col;document.querySelectorAll('.mob-color-swatch').forEach(x=>x.classList.remove('selected'));s.classList.add('selected');});
    cr.appendChild(s);
  });
  const catr=document.getElementById('mob-cat-row'); catr.innerHTML='';
  const noneBtn=document.createElement('div'); noneBtn.className='mob-cat-chip'+(_mobSelectedCatId===''?' selected':'');
  noneBtn.textContent='None';
  noneBtn.addEventListener('click',()=>{_mobSelectedCatId='';document.querySelectorAll('.mob-cat-chip').forEach(x=>x.classList.remove('selected'));noneBtn.classList.add('selected');});
  catr.appendChild(noneBtn);
  CATEGORIES.forEach(cat=>{
    const chip=document.createElement('div'); chip.className='mob-cat-chip'+(_mobSelectedCatId===cat.id?' selected':'');
    chip.style.borderColor=cat.color; chip.textContent=cat.emoji+' '+cat.name;
    chip.addEventListener('click',()=>{_mobSelectedCatId=cat.id;document.querySelectorAll('.mob-cat-chip').forEach(x=>x.classList.remove('selected'));chip.classList.add('selected');});
    catr.appendChild(chip);
  });
  document.getElementById('mob-label').value='';
  const overlay=document.getElementById('mob-sheet-overlay');
  overlay.style.display='flex';
  requestAnimationFrame(()=>overlay.classList.add('open'));
  setTimeout(()=>document.getElementById('mob-label').focus(),300);
}
function closeMobileSheet(){
  const overlay=document.getElementById('mob-sheet-overlay');
  overlay.classList.remove('open');
  setTimeout(()=>{overlay.style.display='none';},220);
}
function selectMobDur(h){
  _mobSelectedDur=h;
  document.querySelectorAll('.mob-dur-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.h)===h));
}
function confirmMobileAdd(){
  const hour=parseInt(document.getElementById('mob-hour').value,10);
  const label=document.getElementById('mob-label').value.trim();
  const bH=_mobSelectedDur*ROW_H-6;
  createBlock(4,findFreeSlot(hour*ROW_H,bH),label,_mobSelectedColor,_mobSelectedCatId,210,bH);
  beep('place'); saveWS(); closeMobileSheet(); showToast('Block added ✓');
}

// ════════════════════════════════════════════════════════════════════
// GRID DROP SETUP — single call guard prevents double-block bug
// ════════════════════════════════════════════════════════════════════
function setupGridDrop(){
  if(_gridDropSetup)return; _gridDropSetup=true;
  const grid=document.getElementById('grid-area');
  grid.addEventListener('dragover',e=>{
    e.preventDefault(); e.dataTransfer.dropEffect='copy';
    if(dragCatId){
      document.querySelectorAll('#grid-area .block.cat-hl').forEach(b=>b.classList.remove('cat-hl'));
      const blk=document.elementFromPoint(e.clientX,e.clientY)?.closest('.block');
      if(blk)blk.classList.add('cat-hl');
    }
  });
  grid.addEventListener('dragleave',e=>{
    if(!grid.contains(e.relatedTarget))
      document.querySelectorAll('#grid-area .block.cat-hl').forEach(b=>b.classList.remove('cat-hl'));
  });
  grid.addEventListener('drop',e=>{
    e.preventDefault();
    document.querySelectorAll('#grid-area .block.cat-hl').forEach(b=>b.classList.remove('cat-hl'));
    const type=e.dataTransfer.getData('text/plain');
    if(type==='cat-tag'){
      const catId=e.dataTransfer.getData('cat-id');
      const blk=document.elementFromPoint(e.clientX,e.clientY)?.closest('#grid-area .block');
      if(blk&&catId){applyBlockCat(blk,catId);saveWS();const cat=CAT_MAP[catId];showToast(`${cat.emoji} ${cat.name} applied ✓`);beep('click');}
      else showToast('Drop onto a block to categorise it');
      dragCatId=null; return;
    }
    if(type==='preset-swatch'){
      const idx=parseInt(e.dataTransfer.getData('preset-idx')||'0',10);
      const presets=JSON.parse(localStorage.getItem('tf_presets_v2')||'[]');
      const p=presets[idx]; if(!p)return;
      const col=BLOCK_COLORS.find(c=>c.hex===p.hex)||BLOCK_COLORS[0];
      const rect=grid.getBoundingClientRect();
      const blk=createBlock(Math.max(0,e.clientX-rect.left-105),findFreeSlot(e.clientY-rect.top,ROW_H-6),p.text,col,p.catId||'');
      beep('place');saveWS();selectBlock(blk);dragColorObj=null;return;
    }
    if(type!=='block-swatch')return;
    const rect=grid.getBoundingClientRect();
    const blk=createBlock(Math.max(0,e.clientX-rect.left-105),findFreeSlot(e.clientY-rect.top,ROW_H-6),'',dragColorObj||BLOCK_COLORS[0],'');
    beep('place');saveWS();selectBlock(blk);dragColorObj=null;
  });
  // Mobile tap on empty slot
  grid.addEventListener('click',e=>{
    if(!isMobileDevice())return;
    if(e.target.closest('.block'))return;
    const gr=grid.getBoundingClientRect();
    const hour=Math.floor((e.clientY-gr.top)/ROW_H);
    if(hour>=0&&hour<24)showMobileAddSheet(hour);
  });
}

// ════════════════════════════════════════════════════════════════════
// PRESET BAR
// ════════════════════════════════════════════════════════════════════
let dragCatId=null;
function deletePreset(idx){
  const presets=JSON.parse(localStorage.getItem('tf_presets_v2')||'[]');
  if(idx<0||idx>=presets.length)return;
  const name=presets[idx].text; presets.splice(idx,1);
  localStorage.setItem('tf_presets_v2',JSON.stringify(presets));
  renderPresetBar(); showToast(`Preset "${name}" removed`);
}
function renderPresetBar(){
  const wrap=document.getElementById('preset-chips-wrap');
  const hint=document.getElementById('preset-bar-hint');
  if(!wrap)return; wrap.innerHTML='';
  const presets=JSON.parse(localStorage.getItem('tf_presets_v2')||'[]');
  if(!presets.length){if(hint)hint.style.display='';return;}
  if(hint)hint.style.display='none';
  presets.forEach((p,i)=>{
    const col=BLOCK_COLORS.find(c=>c.hex===p.hex)||BLOCK_COLORS[0];
    const chip=document.createElement('div');
    chip.className='preset-chip'; chip.draggable=true; chip.style.position='relative';
    chip.innerHTML=`<div class="preset-chip-dot" style="background:${col.hex}"></div>${escHtml(p.text)}`;
    const del=document.createElement('button'); del.textContent='×'; del.title='Remove preset';
    del.style.cssText='position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:#EF4444;color:#fff;border:none;font-size:11px;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;z-index:10;font-weight:700';
    del.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();deletePreset(i);});
    chip.appendChild(del);
    chip.addEventListener('mouseenter',()=>{del.style.display='flex';});
    chip.addEventListener('mouseleave',()=>{del.style.display='none';});
    chip.addEventListener('dragstart',ev=>{dragColorObj=col;ev.dataTransfer.setData('text/plain','preset-swatch');ev.dataTransfer.setData('preset-idx',String(i));ev.dataTransfer.effectAllowed='copy';});
    chip.addEventListener('dragend',()=>{dragColorObj=null;});
    chip.addEventListener('click',()=>{if(isMobileDevice()){_mobSelectedColor=col;_mobSelectedCatId=p.catId||'';showMobileAddSheet(null);setTimeout(()=>{document.getElementById('mob-label').value=p.text;},50);}});
    wrap.appendChild(chip);
  });
}

// ════════════════════════════════════════════════════════════════════
// CAT SIDE PANEL
// ════════════════════════════════════════════════════════════════════
function updateCatSidePanel(){
  const wrap=document.getElementById('cat-list-wrap');if(!wrap)return;
  const blocks=getBlocks();
  const catHours={};CATEGORIES.forEach(c=>catHours[c.id]=0);
  blocks.forEach(b=>{if(b.catId)catHours[b.catId]=(catHours[b.catId]||0)+b.durationH;});
  const maxH=Math.max(...Object.values(catHours),1);
  wrap.innerHTML='';
  const swatchTitle=document.createElement('div');swatchTitle.style.cssText='font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:8px 10px 4px;';swatchTitle.textContent='Drag to Schedule';wrap.appendChild(swatchTitle);
  const swatchGrid=document.createElement('div');swatchGrid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 8px 12px;border-bottom:1px solid var(--border)';
  BLOCK_COLORS.forEach(col=>{
    const s=document.createElement('div');s.style.cssText=`height:28px;border-radius:6px;background:${col.hex};cursor:grab;border:2px solid rgba(255,255,255,.15);transition:transform .12s,box-shadow .12s`;s.title=col.name;s.draggable=true;
    s.addEventListener('dragstart',e=>{dragColorObj=col;e.dataTransfer.setData('text/plain','block-swatch');e.dataTransfer.effectAllowed='copy';});
    s.addEventListener('dragend',()=>{dragColorObj=null;});
    s.addEventListener('mouseenter',()=>{s.style.transform='scale(1.12)';s.style.boxShadow='0 4px 12px rgba(0,0,0,.4)';});
    s.addEventListener('mouseleave',()=>{s.style.transform='';s.style.boxShadow='';});
    s.addEventListener('click',()=>{if(isMobileDevice()){_mobSelectedColor=col;showMobileAddSheet(null);}});
    swatchGrid.appendChild(s);
  });
  wrap.appendChild(swatchGrid);
  const catTitle=document.createElement('div');catTitle.style.cssText='font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:10px 10px 2px;';catTitle.textContent='Drag Category → Block';wrap.appendChild(catTitle);
  CATEGORIES.forEach(cat=>{
    const h=(catHours[cat.id]||0);
    const item=document.createElement('div');item.className='cat-item';item.draggable=true;item.dataset.catId=cat.id;item.style.cursor='grab';
    item.innerHTML=`<div class="cat-dot" style="background:${cat.color}"></div><div style="flex:1;min-width:0"><div class="cat-name">${cat.emoji} ${cat.name}</div><div class="cat-bar"><div class="cat-bar-fill" style="width:${(h/maxH*100)}%;background:${cat.color}"></div></div></div><div class="cat-hours">${h>0?h.toFixed(1)+'h':''}</div>`;
    item.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/plain','cat-tag');ev.dataTransfer.setData('cat-id',cat.id);ev.dataTransfer.effectAllowed='copy';item.style.opacity='.5';});
    item.addEventListener('dragend',()=>{item.style.opacity='';});
    wrap.appendChild(item);
  });
}
function toggleCatPanel(){document.getElementById('cat-side-panel').classList.toggle('open');}

// ════════════════════════════════════════════════════════════════════
// ⋯ DROPDOWN — includes media insert + emoji + font size
// ════════════════════════════════════════════════════════════════════
function setBlockDuration(block,hours){
  block.style.height=(hours*ROW_H-6)+'px';
  saveWS(); closeDD(); showToast(`Block set to ${hours}h`);
}

const BLOCK_STICKERS=['🎯','🔥','⭐','💡','📌','🎉','💪','🧠','🎨','📚','🏆','🎵','💰','⚡','🌙','☀️','🌈','❤️','✅','⚠️'];

function openBlockDD(block,btnEl){
  closeDD();
  const portal=document.getElementById('dd-portal');
  const dd=document.createElement('div'); dd.className='block-dd';

  // Colour
  dd.innerHTML=`<div class="dd-title">Colour</div><div class="dd-swatches" id="dd-sw"></div>`;
  BLOCK_COLORS.forEach(col=>{
    const s=document.createElement('div');s.className='dd-swatch'+(block.dataset.hex===col.hex?' cur':'');
    s.style.background=col.hex;s.title=col.name;
    s.addEventListener('click',e=>{e.stopPropagation();applyBlockColor(block,col);saveWS();closeDD();});
    dd.querySelector('#dd-sw').appendChild(s);
  });

  // Duration
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));
  const durTitle=document.createElement('div');durTitle.className='dd-title';durTitle.textContent='Duration';dd.appendChild(durTitle);
  const durRow=document.createElement('div');durRow.style.cssText='display:flex;gap:5px;padding:2px 10px 10px';
  const curH=Math.round(((parseFloat(block.style.height)||block.offsetHeight)+6)/ROW_H);
  [1,2,3,4].forEach(h=>{
    const b=document.createElement('button');b.textContent=`${h}h`;
    b.style.cssText=`flex:1;padding:6px 0;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid ${curH===h?'var(--accent)':'var(--border)'};background:${curH===h?'var(--accent)':'var(--surface)'};color:${curH===h?'#fff':'var(--text)'}`;
    b.addEventListener('click',e=>{e.stopPropagation();setBlockDuration(block,h);});
    durRow.appendChild(b);
  });
  dd.appendChild(durRow);

  // Font size
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));
  const fsTitle=document.createElement('div');fsTitle.className='dd-title';fsTitle.textContent='Font Size';dd.appendChild(fsTitle);
  const fsRow=document.createElement('div');fsRow.style.cssText='display:flex;gap:5px;padding:2px 10px 10px';
  const curFs=parseInt(block.dataset.fontSize||'12');
  [10,12,14,16].forEach(sz=>{
    const b=document.createElement('button');b.textContent=`${sz}`;
    b.style.cssText=`flex:1;padding:6px 0;border-radius:6px;font-size:${sz}px;cursor:pointer;border:1.5px solid ${curFs===sz?'var(--accent)':'var(--border)'};background:${curFs===sz?'var(--accent)':'var(--surface)'};color:${curFs===sz?'#fff':'var(--text)'}`;
    b.addEventListener('click',e=>{
      e.stopPropagation();
      block.dataset.fontSize=String(sz);
      const t=block.querySelector('.block-text');
      if(t)t.style.fontSize=sz+'px';
      saveWS();closeDD();
    });
    fsRow.appendChild(b);
  });
  dd.appendChild(fsRow);

  // Stickers
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));
  const stTitle=document.createElement('div');stTitle.className='dd-title';stTitle.textContent='Sticker / Emoji Overlay';dd.appendChild(stTitle);
  const stGrid=document.createElement('div');stGrid.style.cssText='display:grid;grid-template-columns:repeat(10,1fr);gap:3px;padding:4px 10px 10px';
  BLOCK_STICKERS.forEach(em=>{
    const b=document.createElement('button');b.textContent=em;
    b.style.cssText='background:none;border:none;font-size:16px;cursor:pointer;padding:2px;border-radius:5px;transition:transform .1s';
    b.title='Set as emoji overlay';
    b.addEventListener('mouseenter',()=>{b.style.transform='scale(1.3)';});
    b.addEventListener('mouseleave',()=>{b.style.transform='';});
    b.addEventListener('click',e=>{
      e.stopPropagation();
      // Toggle: if same emoji clicked again, remove it
      const same=block.dataset.emoji===em;
      block.dataset.emoji=same?'':em;
      block.querySelector('.block-emoji-overlay')?.remove();
      if(!same){
        const emojiEl=document.createElement('div');emojiEl.className='block-emoji-overlay';emojiEl.textContent=em;
        block.appendChild(emojiEl);
      }
      saveWS();closeDD();
    });
    stGrid.appendChild(b);
  });
  dd.appendChild(stGrid);

  // Add image
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));
  const imgBtn=mkDDBtn('🖼','Add Image to Block',()=>{
    const input=document.createElement('input');input.type='file';input.accept='image/*';
    input.addEventListener('change',()=>{
      const file=input.files[0]; if(!file)return;
      if(file.size>2*1024*1024){showToast('Image too large — max 2MB');return;}
      const reader=new FileReader();
      reader.onload=ev=>{_addMediaToBlock(block,ev.target.result,'img');showToast('Image added ✓');};
      reader.readAsDataURL(file);
    });
    input.click(); closeDD();
  });
  dd.appendChild(imgBtn);

  // Preset save
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));
  dd.appendChild(mkDDBtn('💾','Save as Preset',()=>{
    const t=block.querySelector('.block-text')?.textContent.trim();
    if(!t){showToast('Type something first!');closeDD();return;}
    const p=JSON.parse(localStorage.getItem('tf_presets_v2')||'[]');
    p.push({text:t,hex:block.dataset.hex,catId:block.dataset.cat||''});
    localStorage.setItem('tf_presets_v2',JSON.stringify(p));closeDD();showToast('Preset saved ✓');renderPresetBar();
  }));
  dd.appendChild(mkDDBtn('⧉','Duplicate',()=>{
    const t=block.querySelector('.block-text')?.innerHTML||'';
    const c=BLOCK_COLORS.find(x=>x.hex===block.dataset.hex)||BLOCK_COLORS[0];
    createBlock(parseFloat(block.style.left)+18,findFreeSlot(parseFloat(block.style.top)+ROW_H,block.offsetHeight),t,c,block.dataset.cat||'',block.offsetWidth,block.offsetHeight);
    saveWS();closeDD();
  }));
  const db=mkDDBtn('🗑','Delete Block',()=>{beep('delete');if(selectedBlock===block)selectedBlock=null;block.remove();saveWS();closeDD();});db.classList.add('danger');
  dd.appendChild(Object.assign(document.createElement('hr'),{className:'dd-divider'}));dd.appendChild(db);
  portal.appendChild(dd);
  const br=btnEl.getBoundingClientRect();
  let top=br.bottom+4,left=br.right-242;
  if(left<6)left=6;if(left+242>window.innerWidth-6)left=window.innerWidth-248;
  if(top+600>window.innerHeight-6)top=Math.max(6,br.top-610);
  dd.style.top=top+'px';dd.style.left=left+'px';
}
function mkDDBtn(icon,label,cb){const b=document.createElement('button');b.className='dd-btn';b.innerHTML=`<span style="font-size:12px;width:15px;text-align:center">${icon}</span>${label}`;b.addEventListener('click',e=>{e.stopPropagation();cb();});return b;}
function closeDD(){document.getElementById('dd-portal').innerHTML='';}

// ════════════════════════════════════════════════════════════════════
// TIME GRID
// ════════════════════════════════════════════════════════════════════
function buildTimeGrid(){
  const col=document.getElementById('time-col'),grid=document.getElementById('grid-area');
  const nl=document.getElementById('now-line'),ch=today.getHours();
  for(let h=0;h<24;h++){
    const lbl=document.createElement('div');lbl.className='time-label'+(h===ch?' cur-hr':'');
    lbl.textContent=typeof fmt12h==='function'?fmt12h(h):h.toString().padStart(2,'0')+':00';
    col.appendChild(lbl);
    const row=document.createElement('div');row.className='grid-row'+(h===ch?' cur-hr-row':'');row.style.top=(h*ROW_H)+'px';grid.insertBefore(row,nl);
  }
}
function updateNowLine(){
  const now=new Date();const top=(now.getHours()*60+now.getMinutes())/1440*(ROW_H*24);
  const nl=document.getElementById('now-line');if(nl)nl.style.top=top+'px';
}
function changeDate(n){const d=new Date(currentDate);d.setDate(d.getDate()+n);setCurrentDate(fmtDate(d));}
function goToday(){setCurrentDate(fmtDate(new Date()));}
function setCurrentDate(ds){currentDate=ds;loadWS(ds);document.getElementById('dnav-label').textContent=dateDisplayStr(ds);}

function renderProfile(){
  const inner=document.getElementById('profile-inner');inner.innerHTML='';
  const s=getStreak(),sc=getScore(),cc=getCharState();
  const level=Math.floor((sc.total||0)/500)+1;
  const xpInLevel=(sc.total||0)%500,xpPct=xpInLevel/500*100;
  const ac=CHARACTERS.find(c=>c.id===sc.activeChar)||CHARACTERS[0];

  // Use real Google name/photo if signed in, otherwise fall back to defaults
  const gUser    = window.TF_USER;
  const dispName = gUser?.displayName || 'Time Architect';
  const dispEmail= gUser?.email       || '';
  const photoURL = gUser?.photoURL    || '';
  const avatarHtml = photoURL
    ? `<img src="${photoURL}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--accent)" referrerpolicy="no-referrer"/>`
    : ac.emoji;

  inner.innerHTML=`
    <div class="view-title">Profile</div>
    <div class="view-sub">Your progress, characters &amp; achievements</div>
    <div class="profile-hero">
      <div class="ph-avatar" style="font-size:${photoURL?'0':'inherit'}">${avatarHtml}<div class="ph-lvl">Lv ${level}</div></div>
      <div class="ph-stats">
        <div class="ph-name">${escHtml(dispName)}</div>
        ${dispEmail?`<div class="ph-tag" style="font-size:11px;color:var(--muted);margin-bottom:4px">${escHtml(dispEmail)}</div>`:''}
        <div class="ph-tag">Active: ${ac.name} (${ac.rarity}) · ${ac.bonus} bonus</div>
        <div class="ph-row">
          <div class="ph-stat"><div class="ph-stat-val">${(sc.total||0).toLocaleString()}</div><div class="ph-stat-lbl">Points</div></div>
          <div class="ph-stat"><div class="ph-stat-val">${s.count}</div><div class="ph-stat-lbl">Streak</div></div>
          <div class="ph-stat"><div class="ph-stat-val">${s.shields||0}</div><div class="ph-stat-lbl">Shields</div></div>
          <div class="ph-stat"><div class="ph-stat-val">${cc.unlocked.length}/${CHARACTERS.length}</div><div class="ph-stat-lbl">Characters</div></div>
        </div>
        <div class="xp-section">
          <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
          <div class="xp-label"><span>Lv ${level}</span><span>${xpInLevel}/500 XP</span><span>Lv ${level+1}</span></div>
        </div>
        <button onclick="signOutUser()" style="margin-top:14px;background:rgba(239,68,68,.12);color:#EF4444;border:1px solid rgba(239,68,68,.3);border-radius:9px;padding:8px 18px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">
          Sign Out of Google
        </button>
      </div>
    </div>
    <div class="chars-section" id="chars-section"></div>
  `;
  const cs=document.getElementById('chars-section');
  ['common','rare','epic','legendary'].forEach(rarity=>{
    const chars=CHARACTERS.filter(c=>c.rarity===rarity);
    const section=document.createElement('div');
    const rc={common:'var(--r-common)',rare:'var(--r-rare,#5B8DD9)',epic:'var(--r-epic,#9B59B6)',legendary:'var(--r-legendary,#E6A817)'};
    section.innerHTML=`<div class="chars-rarity-label" style="color:${rc[rarity]}">${rarity}</div>`;
    const grid=document.createElement('div');grid.className='chars-grid';
    chars.forEach(ch=>{
      const unlocked=cc.unlocked.includes(ch.id);const isActive=sc.activeChar===ch.id;
      const card=document.createElement('div');card.className=`char-card r-${ch.rarity}${!unlocked?' locked':''}${isActive?' active-char':''}`;
      card.innerHTML=`${isActive?'<div class="char-active-badge">Active</div>':''}${!unlocked?'<div style="position:absolute;top:6px;right:6px;font-size:11px;opacity:.6">🔒</div>':''}
      <span class="char-emoji">${ch.emoji}</span><div class="char-name">${ch.name}</div>
      <div class="char-rarity r-${ch.rarity}">${ch.rarity}</div><div class="char-bonus">${ch.bonus}</div>
      <div class="char-pts">${unlocked?'✓ Unlocked':(ch.pts===0?'Starter':ch.pts.toLocaleString()+' pts')}</div>`;
      if(unlocked&&!isActive){card.title=`Click to activate ${ch.name}`;card.addEventListener('click',()=>{sc.activeChar=ch.id;ss('SCORE',sc);renderProfile();updateStreakUI();showToast(`${ch.emoji} ${ch.name} activated!`);beep('click');});}
      grid.appendChild(card);
    });
    section.appendChild(grid);cs.appendChild(section);
  });
}


function showModal({title,body,btn,onConfirm}){
  const ov=document.createElement('div');ov.className='modal-ov';
  ov.innerHTML=`<div class="modal"><button class="modal-close" onclick="this.closest('.modal-ov').remove()">✕</button><div class="modal-title">${title}</div>${body}<button class="modal-btn" id="modal-confirm-btn">${btn||'Confirm'}</button></div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
  if(onConfirm){
    ov.querySelector('#modal-confirm-btn').addEventListener('click',()=>{if(onConfirm()!==false)ov.remove();});
  }
}


const VIEW_TITLES={home:'Schedule',categories:'Categories','important-dates':'Important Dates',analytics:'Analytics',friends:'Friends',messages:'Messages',business:'Business',profile:'Profile'};
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.mbn-item[data-view]').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('view-'+view);if(el)el.classList.add('active');
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  document.querySelector(`.mbn-item[data-view="${view}"]`)?.classList.add('active');
  document.getElementById('topbar-title').textContent=VIEW_TITLES[view]||view;
  document.getElementById('date-nav').classList.toggle('hidden',view!=='home');
  // On-switch renders
  if(view==='analytics')renderAnalytics();
  if(view==='categories')renderCategoriesView();
  if(view==='important-dates')renderDates();
  if(view==='friends')renderFriends();
  if(view==='messages')renderMsgList();
  if(view==='business')renderBusiness();
  if(view==='profile')renderProfile();
  beep('click');
}


function init(){
  const cc=getCharState(); if(!cc.unlocked.includes('neko')){cc.unlocked.push('neko'); ss('CHARS',cc);} 
  initTheme(); buildTimeGrid(); updateNowLine(); setInterval(updateNowLine,60000); setupGridDrop(); updateStreakUI(); updateNotifBadge(); renderRightPanel(); renderPresetBar(); renderDates(); setCurrentDate(fmtDate(today));
  setTimeout(()=>{const ws=document.getElementById('ws-scroll'); if(ws) ws.scrollTop=Math.max(0,today.getHours()*ROW_H-120);},200);
  document.getElementById('cat-side-panel').classList.add('open');
  document.getElementById('dnav-label').textContent=dateDisplayStr(fmtDate(today));
  const dates=getDates(); document.getElementById('nb-dates').textContent=dates.filter(d=>d.pinned).length||''; document.getElementById('nb-dates').style.display=dates.filter(d=>d.pinned).length?'':'none';
  document.addEventListener('click',()=>{closeDD(); closeNotif();});
  document.querySelector('.topbar-hamburger')?.addEventListener('click',()=>{ if(window.innerWidth<=768){ document.getElementById('sidebar').classList.toggle('mobile-open'); } });
  document.addEventListener('click',e=>{ if(window.innerWidth<=768 && !e.target.closest('#sidebar') && !e.target.closest('.topbar-hamburger')) document.getElementById('sidebar').classList.remove('mobile-open'); }, true);
  setBizViewMode('week');
  showToast('⌨️ Select block → Delete to remove · Ctrl+drag to duplicate');
}
// init() is called by auth.js after Google sign-in resolves.
// Do NOT call it here directly — auth.js owns the boot sequence.

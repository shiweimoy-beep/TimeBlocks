// chat.js — Real friends via Firestore, real-time chat, schedule sharing

// ── Firestore helpers ─────────────────────────────────────────────────────────
const _fdb = () => window.TF_DB;
const _uid = () => window.TF_USER?.uid;

// chatId is always the two UIDs sorted and joined — deterministic
function _chatId(uid1, uid2) { return [uid1, uid2].sort().join('_'); }

// ── Active chat listener cleanup ─────────────────────────────────────────────
let _chatUnsub = null;

// ── In-memory friends cache (populated from Firestore on renderFriends) ──────
let _friendsCache = [];

// ════════════════════════════════════════════════════════════════════════════
// FRIENDS
// ════════════════════════════════════════════════════════════════════════════

async function addFriendByTag() {
  const input  = document.getElementById('add-friend-input');
  let   tag    = (input.value||'').trim().toUpperCase();
  if (!tag.startsWith('#')) tag = '#' + tag;
  if (tag.length < 4) { showToast('Enter a valid tag e.g. #ABG67852'); return; }
  if (!_uid()) { showToast('Not signed in'); return; }

  // Can't add yourself
  if (tag === window.TF_PROFILE?.friendTag) { showToast("That's your own tag!"); return; }

  // Search Firestore for user with that tag
  let snap;
  try { snap = await _fdb().collection('users').where('friendTag','==',tag).limit(1).get(); }
  catch(e) { showToast('Error searching: '+e.message); return; }

  if (snap.empty) { showToast('No user found with tag '+tag); return; }

  const friendDoc  = snap.docs[0];
  const friendUid  = friendDoc.id;
  const friendData = friendDoc.data();

  // Check already friends
  const existing = await _fdb().collection('users').doc(_uid()).collection('friends').doc(friendUid).get();
  if (existing.exists) { showToast('Already friends with '+friendData.displayName); return; }

  // Add to my friends list
  const friendEntry = {
    uid:         friendUid,
    displayName: friendData.displayName||'Friend',
    photoURL:    friendData.photoURL||'',
    friendTag:   friendData.friendTag||'',
    addedAt:     Date.now(),
  };
  await _fdb().collection('users').doc(_uid()).collection('friends').doc(friendUid).set(friendEntry);

  // Also add me to their friends list (mutual)
  const me = window.TF_PROFILE;
  await _fdb().collection('users').doc(friendUid).collection('friends').doc(_uid()).set({
    uid:         _uid(),
    displayName: window.TF_USER?.displayName||'Friend',
    photoURL:    window.TF_USER?.photoURL||'',
    friendTag:   me?.friendTag||'',
    addedAt:     Date.now(),
  });

  input.value = '';
  showToast('🎉 '+friendData.displayName+' added as friend!');
  beep('complete');
  renderFriends();
}

async function _loadFriends() {
  if (!_uid()) return [];
  try {
    const snap = await _fdb().collection('users').doc(_uid()).collection('friends').get();
    return snap.docs.map(d => d.data());
  } catch(e) { console.warn(e); return []; }
}

async function removeFriend(friendUid) {
  if (!_uid()) return;
  await _fdb().collection('users').doc(_uid()).collection('friends').doc(friendUid).delete().catch(console.error);
  await _fdb().collection('users').doc(friendUid).collection('friends').doc(_uid()).delete().catch(console.error);
  showToast('Friend removed');
  renderFriends();
}

// ── Schedule sharing ─────────────────────────────────────────────────────────
async function toggleScheduleShare(friendUid, btn) {
  const newVal = !window.TF_PROFILE?.shareSchedule;
  await updateProfile({ shareSchedule: newVal });
  if (newVal) {
    // Push today's schedule to Firestore so friends can see it
    syncScheduleNow();
    showToast('📅 Schedule sharing ON');
  } else {
    showToast('Schedule sharing OFF');
  }
  btn.textContent  = newVal ? '🔒 Hide Schedule' : '📅 Share Schedule';
  btn.style.background = newVal ? 'rgba(239,68,68,.2)' : '';
}

function syncScheduleNow() {
  if (!_uid() || !window.TF_PROFILE?.shareSchedule) return;
  const blocks = JSON.parse(localStorage.getItem(wsKey(currentDate))||'[]');
  _fdb().collection('schedules').doc(_uid())
    .collection('days').doc(currentDate)
    .set({ blocks, updatedAt: Date.now() }).catch(console.error);
}

async function viewFriendSchedule(friend) {
  if (!friend.shareSchedule) { showToast(friend.displayName+' hasn\'t shared their schedule'); return; }
  const panel = document.getElementById('friend-sched-panel');
  const overlay = document.getElementById('friend-sched-overlay');
  document.getElementById('friend-sched-name').textContent = friend.displayName + '\'s Schedule — Today';
  const content = document.getElementById('friend-sched-content');
  content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Loading…</div>';
  overlay.classList.add('open');

  try {
    const snap = await _fdb().collection('schedules').doc(friend.uid)
      .collection('days').doc(fmtDate(new Date())).get();
    if (!snap.exists || !snap.data().blocks?.length) {
      content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">No schedule shared for today.</div>';
      return;
    }
    const blocks = snap.data().blocks;
    content.innerHTML = '<div style="padding:12px;display:flex;flex-direction:column;gap:6px">' +
      blocks.map(b => {
        const cat = CAT_MAP[b.catId];
        const startH = Math.round(b.top / 64); // ROW_H=64
        const durH   = Math.round((b.height + 6) / 64);
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:${b.hex};color:${b.fg||'#fff'}">
          <div style="font-size:18px">${cat?.emoji||'📌'}</div>
          <div>
            <div style="font-weight:600;font-size:13px">${escHtml(b.text||'(no label)')}</div>
            <div style="font-size:11px;opacity:.8">${fmt12h(startH)} · ${durH}h${cat?' · '+cat.name:''}</div>
          </div>
        </div>`;
      }).join('') + '</div>';
  } catch(e) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:#EF4444">Error loading schedule.</div>';
  }
}

function closeFriendSched() {
  document.getElementById('friend-sched-overlay').classList.remove('open');
}

// ── Render Friends tab ───────────────────────────────────────────────────────
async function renderFriends() {
  const list = document.getElementById('friend-list');
  list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Loading friends…</div>';

  // Show user's own tag
  const tagEl = document.getElementById('my-tag-val');
  if (tagEl) tagEl.textContent = window.TF_PROFILE?.friendTag||'…';

  const sc = getScore(), s = getStreak();
  const me = {
    uid:'me', id:'me', displayName:'You',
    photoURL: window.TF_USER?.photoURL||'',
    friendTag: window.TF_PROFILE?.friendTag||'',
    streak: s.count, score: sc.total||0,
    shareSchedule: window.TF_PROFILE?.shareSchedule||false,
    isSelf: true,
  };

  const friends = await _loadFriends();
  _friendsCache = friends;

  // Load sharing status for each friend
  const enriched = await Promise.all(friends.map(async f => {
    try {
      const doc = await _fdb().collection('users').doc(f.uid).get();
      return { ...f, shareSchedule: doc.data()?.shareSchedule||false };
    } catch { return { ...f, shareSchedule: false }; }
  }));

  const all = [me, ...enriched].sort((a,b)=>(b.score||0)-(a.score||0));
  list.innerHTML = '';

  all.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const avatarHtml = f.photoURL
      ? `<img src="${f.photoURL}" style="width:38px;height:38px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`
      : `<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${(f.displayName||'?')[0].toUpperCase()}</div>`;

    const actionsHtml = f.isSelf
      ? `<button class="friend-btn" onclick="switchView('profile')">View Profile</button>`
      : `<button class="friend-btn" onclick="openChatWith('${f.uid}','${escHtml(f.displayName)}','${escHtml(f.photoURL||'')}')">💬 Chat</button>
         <button class="friend-btn ${f.shareSchedule?'':'friend-btn-muted'}" title="${f.shareSchedule?'View their schedule':'Schedule not shared'}" onclick="viewFriendSchedule(${JSON.stringify(f).replace(/"/g,'&quot;')})">📅</button>
         <button class="friend-btn friend-btn-danger" onclick="removeFriend('${f.uid}')" title="Remove friend">✕</button>`;

    card.innerHTML = `
      <div class="friend-av">${avatarHtml}</div>
      <div class="friend-info">
        <div class="friend-name">${escHtml(f.displayName)}${f.isSelf?' (You)':''}</div>
        <div class="friend-meta">#${i+1} · 🔥 ${f.streak||0}d · ${(f.score||0).toLocaleString()} pts</div>
        <div class="friend-tag-badge">${f.friendTag||''}</div>
      </div>
      <div class="friend-actions">${actionsHtml}</div>`;

    if (f.isSelf) {
      // Share schedule toggle for self
      const shareToggle = document.createElement('button');
      shareToggle.className = 'friend-btn';
      shareToggle.style.cssText = 'margin-top:4px;width:100%;font-size:10px;' + (me.shareSchedule?'background:rgba(239,68,68,.2)':'');
      shareToggle.textContent = me.shareSchedule ? '🔒 Stop Sharing Schedule' : '📅 Share My Schedule';
      shareToggle.onclick = () => toggleScheduleShare(null, shareToggle);
      card.querySelector('.friend-actions').appendChild(shareToggle);
    }

    list.appendChild(card);
  });

  if (friends.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--muted);padding:30px;font-size:13px';
    empty.innerHTML = '👥<br><br>No friends yet.<br>Share your tag above to connect!';
    list.appendChild(empty);
  }
}

async function renderMsgList() {
  const list = document.getElementById('msg-friend-list');
  list.innerHTML = '';
  const friends = _friendsCache.length ? _friendsCache : await _loadFriends();
  if (!friends.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Add friends in the Friends tab to start chatting.</div>';
    return;
  }
  friends.forEach(f => {
    const card = document.createElement('div');
    card.className = 'friend-card';
    const av = f.photoURL
      ? `<img src="${f.photoURL}" style="width:38px;height:38px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`
      : `<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">${(f.displayName||'?')[0].toUpperCase()}</div>`;
    card.innerHTML = `<div class="friend-av">${av}</div><div class="friend-info"><div class="friend-name">${escHtml(f.displayName)}</div><div class="friend-meta">Tap to chat</div></div><div class="friend-actions"><button class="friend-btn" onclick="openChatWith('${f.uid}','${escHtml(f.displayName)}','${escHtml(f.photoURL||'')}')">Open Chat</button></div>`;
    list.appendChild(card);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// CHAT  — Firestore real-time
// ════════════════════════════════════════════════════════════════════════════

function toggleChat() {
  const ov = document.getElementById('chat-overlay');
  if (ov.classList.contains('open')) { ov.classList.remove('open'); _cleanupChat(); }
  else { renderChatFriendList(); ov.classList.add('open'); backToChatList(); }
}
function handleChatOvClick(e) { if (e.target.id === 'chat-overlay') toggleChat(); }

async function renderChatFriendList() {
  const list = document.getElementById('chat-friend-list');
  list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted)">Loading…</div>';
  const friends = _friendsCache.length ? _friendsCache : await _loadFriends();
  list.innerHTML = '';
  if (!friends.length) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">No friends yet — add them in the Friends tab.</div>';
    return;
  }
  friends.forEach(f => {
    const item = document.createElement('div');
    item.className = 'chat-fitem';
    const av = f.photoURL
      ? `<img src="${f.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`
      : `<div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px">${(f.displayName||'?')[0].toUpperCase()}</div>`;
    item.innerHTML = `<div class="cfi-av">${av}</div><div class="cfi-info"><div class="cfi-name">${escHtml(f.displayName)}</div><div class="cfi-preview">${f.friendTag||''}</div></div>`;
    item.addEventListener('click', () => openChatWith(f.uid, f.displayName, f.photoURL||''));
    list.appendChild(item);
  });
}

function openChatWith(friendUid, friendName, friendPhoto) {
  if (!_uid()) { showToast('Not signed in'); return; }
  activeChatId = friendUid;

  const ov = document.getElementById('chat-overlay');
  if (!ov.classList.contains('open')) ov.classList.add('open');

  // Header
  const avEl = document.getElementById('chat-av');
  if (friendPhoto) {
    avEl.innerHTML = `<img src="${friendPhoto}" style="width:32px;height:32px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`;
  } else {
    avEl.textContent = (friendName||'?')[0].toUpperCase();
  }
  document.getElementById('chat-name').textContent   = friendName;
  document.getElementById('chat-status').textContent = 'Online';

  document.getElementById('chat-list-view').style.display = 'none';
  document.getElementById('chat-msgs-view').classList.add('active');

  const scroll = document.getElementById('chat-scroll');
  scroll.innerHTML = '';
  _cleanupChat();

  // Firestore real-time listener
  const cid = _chatId(_uid(), friendUid);
  _chatUnsub = _fdb()
    .collection('chats').doc(cid).collection('messages')
    .orderBy('time', 'asc')
    .onSnapshot(snap => {
      const scroll2 = document.getElementById('chat-scroll');
      scroll2.innerHTML = '';
      snap.docs.forEach(doc => {
        const m = doc.data();
        _appendMsg(scroll2, m, friendPhoto, friendName);
      });
      scroll2.scrollTop = scroll2.scrollHeight;
    }, err => console.warn('Chat listener error', err));

  // Focus input
  setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
}

function _appendMsg(scroll, m, friendPhoto, friendName) {
  const isMe = m.from === _uid();
  const row   = document.createElement('div');
  row.className = 'msg-row ' + (isMe ? 'me' : 'them');

  let avHtml = '';
  if (!isMe) {
    avHtml = friendPhoto
      ? `<div class="msg-av"><img src="${friendPhoto}" style="width:26px;height:26px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/></div>`
      : `<div class="msg-av">${(friendName||'?')[0]}</div>`;
  }

  // ── FIX: use textContent via DOM, never innerHTML for message text ──────
  // This prevents the vertical-character CSS rendering bug entirely.
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = m.text; // safe, no HTML injection, no layout issues

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = formatTime(m.time);

  const content = document.createElement('div');
  content.className = 'msg-content';
  content.appendChild(bubble);
  content.appendChild(timeDiv);

  row.innerHTML = avHtml;
  row.appendChild(content);
  scroll.appendChild(row);
}

function _cleanupChat() {
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
}

function backToChatList() {
  _cleanupChat();
  activeChatId = null;
  document.getElementById('chat-list-view').style.display = '';
  document.getElementById('chat-msgs-view').classList.remove('active');
  renderChatFriendList();
}

// ── BUG FIX: single Enter handler, reads input.value correctly ───────────────
// Old code had TWO keydown handlers (onkeydown attr + addEventListener)
// causing double-fire issues. Now only ONE handler via addEventListener.
document.addEventListener('DOMContentLoaded', () => {
  const ci = document.getElementById('chat-input');
  if (!ci) return;
  ci.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
});

function sendMsg() {
  const input = document.getElementById('chat-input');
  // ── FIX: read value from the input element directly, trim whitespace ──────
  const text = input.value.trim();
  if (!text || !activeChatId || !_uid()) return;
  input.value = ''; // clear BEFORE the async write so UI feels instant

  const cid = _chatId(_uid(), activeChatId);
  const msg = { from: _uid(), text: text, time: Date.now() };

  _fdb().collection('chats').doc(cid).collection('messages').add(msg)
    .catch(err => {
      showToast('Failed to send: ' + err.message);
      input.value = text; // restore on error
    });

  beep('click');
}

// ── chatKey exposed globally for index.html compatibility ─────────────────────
function chatKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }

// ════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL & LEADERBOARD
// ════════════════════════════════════════════════════════════════════════════
function renderRightPanel() {
  const lb = document.getElementById('rp-lb'); lb.innerHTML = '';
  const sc = getScore(), s = getStreak();
  const me = { name:'You', avatar: window.TF_USER?.photoURL||'👤', streak:s.count, score:sc.total||0 };
  const all = [me, ...(_friendsCache.map(f=>({ name:f.displayName, avatar:f.photoURL||'👤', streak:0, score:0 })))].sort((a,b)=>b.score-a.score);
  all.forEach((f,i) => {
    const rank = i+1;
    const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank+'';
    const avHtml = f.avatar && f.avatar.startsWith('http')
      ? `<img src="${f.avatar}" style="width:24px;height:24px;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`
      : `<div style="font-size:18px">${f.avatar}</div>`;
    lb.innerHTML += `<div class="lb-item"><div class="lb-rank ${rank<=3?'r'+rank:''}">${medal}</div><div class="lb-av">${avHtml}</div><div class="lb-info"><div class="lb-name">${escHtml(f.name)}</div><div class="lb-meta">🔥 ${f.streak}d</div></div><div class="lb-score">${(f.score).toLocaleString()}</div></div>`;
  });
  const act = document.getElementById('rp-activity'); act.innerHTML = '';
  const activities = [
    {icon:'🔥',text:'Keep your streak going!',time:'now'},
    {icon:'📅',text:'Plan your day for bonus points',time:''},
    {icon:'🏆',text:'Complete blocks to climb the leaderboard',time:''},
  ];
  activities.forEach(a => { act.innerHTML += `<div class="activity-item"><div class="act-icon">${a.icon}</div><div class="act-body"><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div></div>`; });
}
function toggleRightPanel() { document.getElementById('right-panel').classList.toggle('hidden'); }
function toggleCalSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

// auth.js — loads first, sets up Firebase auth + Firestore user profile
const _auth     = window.TF_AUTH;
const _db       = window.TF_DB;
const _provider = new firebase.auth.GoogleAuthProvider();

window.getUserPrefix = function() {
  return window.TF_USER ? window.TF_USER.uid + '_' : 'guest_';
};

function _genTag() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const D = '0123456789';
  let t = '#';
  for (let i=0;i<3;i++) t += L[Math.floor(Math.random()*L.length)];
  for (let i=0;i<5;i++) t += D[Math.floor(Math.random()*D.length)];
  return t;
}

async function _getUniqueTag() {
  for (let i=0;i<10;i++) {
    const tag = _genTag();
    const snap = await _db.collection('users').where('friendTag','==',tag).limit(1).get();
    if (snap.empty) return tag;
  }
  return _genTag();
}

async function _ensureProfile(user) {
  const ref  = _db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const tag     = await _getUniqueTag();
    const profile = {
      displayName: user.displayName||'Time Architect',
      photoURL:    user.photoURL||'',
      email:       user.email||'',
      friendTag:   tag,
      shareSchedule: false,
      createdAt:   Date.now(),
    };
    await ref.set(profile);
    return profile;
  }
  return snap.data();
}

function _updateSidebarUser(user, profile) {
  const nameEl = document.querySelector('.sb-user-name');
  const avEl   = document.getElementById('sb-av');
  if (nameEl) nameEl.textContent = user.displayName||'Time Architect';
  if (avEl) {
    if (user.photoURL) {
      avEl.innerHTML = `<img src="${user.photoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block" referrerpolicy="no-referrer"/>`;
    } else {
      avEl.textContent = (user.displayName||'U')[0].toUpperCase();
    }
  }
  const tagEl = document.getElementById('my-tag-val');
  if (tagEl && profile) tagEl.textContent = profile.friendTag||'…';
}

_auth.onAuthStateChanged(async function(user) {
  const loginScreen = document.getElementById('login-screen');
  const appEl       = document.getElementById('app');
  if (user) {
    window.TF_USER = user;
    try { window.TF_PROFILE = await _ensureProfile(user); }
    catch(e) { console.warn(e); window.TF_PROFILE = {friendTag:'…',shareSchedule:false}; }
    loginScreen.style.display = 'none';
    appEl.style.display = '';
    _updateSidebarUser(user, window.TF_PROFILE);
    if (typeof init === 'function') init();
  } else {
    window.TF_USER = window.TF_PROFILE = null;
    loginScreen.style.display = 'flex';
    appEl.style.display = 'none';
  }
});

document.getElementById('google-login-btn').addEventListener('click', function() {
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('google-login-btn');
  errEl.style.display = 'none';
  btn.textContent = 'Signing in…';
  btn.disabled = true;
  _auth.signInWithPopup(_provider).catch(function(err) {
    btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20"/> Continue with Google';
    btn.disabled = false;
    errEl.textContent = err.code==='auth/popup-closed-by-user'?'Sign-in cancelled. Try again.':'Error: '+err.message;
    errEl.style.display = 'block';
  });
});

function signOutUser() {
  _auth.signOut().then(()=>window.location.reload()).catch(err=>showToast('Error: '+err.message));
}

function updateProfile(fields) {
  if (!window.TF_USER) return;
  Object.assign(window.TF_PROFILE, fields);
  return _db.collection('users').doc(window.TF_USER.uid).update(fields).catch(console.error);
}

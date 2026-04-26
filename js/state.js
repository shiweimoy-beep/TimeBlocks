const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT=['Su','Mo','Tu','We','Th','Fr','Sa'];
const ROW_H=64;

// Category system
const CATEGORIES=[
  {id:'eat',       name:'Eat',          emoji:'🍽',  color:'#F59E0B'},
  {id:'chores',    name:'Chores',       emoji:'🧹',  color:'#6B7280'},
  {id:'transport', name:'Transport',    emoji:'🚗',  color:'#3B82F6'},
  {id:'study',     name:'Study',        emoji:'📚',  color:'#8B5CF6'},
  {id:'exercise',  name:'Exercise',     emoji:'💪',  color:'#10B981'},
  {id:'hangout',   name:'Hanging Out',  emoji:'😄',  color:'#EC4899'},
  {id:'sleep',     name:'Sleep',        emoji:'😴',  color:'#6366F1'},
  {id:'entertain', name:'Entertainment',emoji:'🎮',  color:'#F97316'},
  {id:'compete',   name:'Competitions', emoji:'🏆',  color:'#EAB308'},
  {id:'work',      name:'Work',         emoji:'💼',  color:'#14B8A6'},
  {id:'personal',  name:'Personal Care',emoji:'🧴',  color:'#A78BFA'},
  {id:'family',    name:'Family Time',  emoji:'👨‍👩‍👧',  color:'#FB7185'},
  {id:'hobbies',   name:'Hobbies',      emoji:'🎨',  color:'#34D399'},
  {id:'social',    name:'Social Media', emoji:'📱',  color:'#60A5FA'},
  {id:'school',    name:'School',       emoji:'🏫',  color:'#FBBF24'},
];
const CAT_MAP=Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));

// Block colours
const BLOCK_COLORS=[
  {name:'Sky',     hex:'#38BDF8',fg:'#0C1A2E'},{name:'Sage',    hex:'#4ADE80',fg:'#0C2215'},
  {name:'Peach',   hex:'#FB923C',fg:'#2C1000'},{name:'Lavender',hex:'#A78BFA',fg:'#1A0D35'},
  {name:'Rose',    hex:'#FB7185',fg:'#2C0010'},{name:'Mint',    hex:'#2DD4BF',fg:'#001F1C'},
  {name:'Sun',     hex:'#FBBF24',fg:'#2C2000'},{name:'Night',   hex:'#1E293B',fg:'#CBD5E1'},
  {name:'Red',     hex:'#EF4444',fg:'#fff'},{name:'Purple',  hex:'#7C3AED',fg:'#fff'},
  {name:'Cyan',    hex:'#06B6D4',fg:'#002030'},{name:'Ember',   hex:'#DC2626',fg:'#fff'},
];

// Characters
const CHARACTERS=[
  {id:'neko',emoji:'🐱',name:'Neko',rarity:'common',pts:0,bonus:'+2%',bonusVal:.02},
  {id:'buddy',emoji:'🐶',name:'Buddy',rarity:'common',pts:1000,bonus:'+2%',bonusVal:.02},
  {id:'foxy',emoji:'🦊',name:'Foxy',rarity:'common',pts:2000,bonus:'+3%',bonusVal:.03},
  {id:'kobi',emoji:'🐨',name:'Kobi',rarity:'common',pts:3000,bonus:'+4%',bonusVal:.04},
  {id:'ribbit',emoji:'🐸',name:'Ribbit',rarity:'common',pts:4000,bonus:'+4%',bonusVal:.04},
  {id:'leo',emoji:'🦁',name:'Leo',rarity:'rare',pts:5000,bonus:'+8%',bonusVal:.08},
  {id:'stripes',emoji:'🐯',name:'Stripes',rarity:'rare',pts:10000,bonus:'+10%',bonusVal:.10},
  {id:'flutter',emoji:'🦋',name:'Flutter',rarity:'rare',pts:20000,bonus:'+12%',bonusVal:.12},
  {id:'drake',emoji:'🐉',name:'Drake',rarity:'epic',pts:35000,bonus:'+15%',bonusVal:.15},
  {id:'sparkle',emoji:'🦄',name:'Sparkle',rarity:'epic',pts:60000,bonus:'+18%',bonusVal:.18},
  {id:'kronos',emoji:'👑',name:'Kronos',rarity:'legendary',pts:100000,bonus:'+25%',bonusVal:.25},
];
const DAY_POINTS=[0,50,100,150,250,350,500,650,800,900,1000];

const MOCK_FRIENDS=[
  {id:'alex',  name:'Alex Chen',  avatar:'🦊',streak:14,score:6800,active:true},
  {id:'jordan',name:'Jordan Lee', avatar:'🐱',streak:21,score:11200,active:false},
  {id:'sam',   name:'Sam Park',   avatar:'🐨',streak:7, score:3200, active:true},
  {id:'maya',  name:'Maya Singh', avatar:'🦋',streak:3, score:1800, active:false},
  {id:'chris', name:'Chris Wu',   avatar:'🐸',streak:0, score:940,  active:true},
];

const BOT_REPLIES=[
  "That's a solid schedule! 🔥","Keep it up, looking productive!","Nice work staying consistent 💪",
  "How's the planning going?","I need to update mine too 😅","You're crushing it today!",
  "Love the colour coding! 🎨","When do you usually start your day?","Maybe we can sync schedules sometime!",
  "Solid routine 👌","You're on a roll! 🎯","Inspiring me to be more organised 📅",
  "Great category breakdown!","How many hours do you study daily?","Keep that streak going! 🔥",
];

const DATE_CARD_COLORS=[
  'linear-gradient(135deg,rgba(124,58,237,.35),rgba(6,182,212,.2))',
  'linear-gradient(135deg,rgba(245,158,11,.35),rgba(239,68,68,.2))',
  'linear-gradient(135deg,rgba(16,185,129,.35),rgba(6,182,212,.2))',
  'linear-gradient(135deg,rgba(236,72,153,.35),rgba(124,58,237,.2))',
  'linear-gradient(135deg,rgba(59,130,246,.35),rgba(99,102,241,.2))',
  'linear-gradient(135deg,rgba(251,146,60,.35),rgba(245,158,11,.2))',
];

const EMP_COLORS=['#38BDF8','#4ADE80','#FB923C','#A78BFA','#FB7185','#2DD4BF','#FBBF24','#EF4444'];

const SK={
  STREAK:'tf_streak_v6',SCORE:'tf_score_v4',CHARS:'tf_chars_v4',
  MISSIONS:'tf_missions_v4',NOTIFS:'tf_notifs_v2',
  DATES:'tf_dates_v1',THEME:'tf_theme_v1',
};
// ─── Per-user storage: every key is prefixed with the Firebase UID ────────────
// getUserPrefix() is defined in auth.js and returns  "uid_"  or  "guest_"
function _pfx(k){ return (window.getUserPrefix ? window.getUserPrefix() : 'guest_') + k; }
function gs(k){  try{return JSON.parse(localStorage.getItem(_pfx(SK[k])))||null}catch{return null}}
function ss(k,d){localStorage.setItem(_pfx(SK[k]),JSON.stringify(d))}

// Raw helpers for dynamic keys (e.g. per-month business data) — also prefixed
function gsRaw(key){try{return JSON.parse(localStorage.getItem(_pfx(key)))||null}catch{return null}}
function ssRaw(key,d){localStorage.setItem(_pfx(key),JSON.stringify(d))}

function wsKey(d){return _pfx('tf_ws2_'+d)}

let currentDate=fmtDate(new Date());
let activeChatId=null;
let bizWeekOffset=0;
let dragColorObj=null;
const today=new Date();

// ─── Global business hour-range settings ─────────────────────────────────────
// FIX: custom working hours instead of always 0-23
let bizStartH=7;  // default 7 AM
let bizEndH=22;   // default 10 PM

function fmtDate(d){return d.toISOString().slice(0,10)}
function snapY(y){return Math.max(0,Math.round(y/ROW_H)*ROW_H)}
function dateDisplayStr(ds){
  const t=fmtDate(new Date());const y=fmtDate(new Date(new Date().setDate(new Date().getDate()-1)));
  if(ds===t)return'Today';if(ds===y)return'Yesterday';
  const d=new Date(ds);return d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
}
function seededRng(seed){let h=0;for(let i=0;i<seed.length;i++)h=Math.imul(31,h)+seed.charCodeAt(i)|0;return()=>{h^=h<<13;h^=h>>17;h^=h<<5;return(h>>>0)/0xFFFFFFFF}}
function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

// ─── FIX: Global 12-hour time format utility ──────────────────────────────────
// Used across Schedule, Analytics, and Business sections.
function fmt12h(h){
  const suffix=h>=12?'PM':'AM';
  const h12=h%12||12;
  return`${h12}:00 ${suffix}`;
}
function fmt12hRange(start,end){
  return`${fmt12h(start)} – ${fmt12h(end)}`;
}
// Overwrite the existing formatTime to also be AM/PM (used in chat timestamps)
function formatTime(ts){return new Date(ts).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:true})}


function initTheme(){
  const saved=gs('THEME');
  document.documentElement.setAttribute('data-theme',saved||'dark');
  document.getElementById('theme-btn').textContent=saved==='light'?'🌙':'☀️';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  ss('THEME',next);
  document.getElementById('theme-btn').textContent=next==='light'?'🌙':'☀️';
}


function beep(type='place'){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const plays={
      place(){[0,.07].forEach(o=>{const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='sawtooth';osc.frequency.setValueAtTime(200,ctx.currentTime+o);osc.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+o+.06);g.gain.setValueAtTime(.14,ctx.currentTime+o);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+o+.07);osc.start(ctx.currentTime+o);osc.stop(ctx.currentTime+o+.08);})},
      complete(){[0,.12,.24].forEach((o,i)=>{const f=[600,750,900][i];const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='triangle';osc.frequency.value=f;g.gain.setValueAtTime(.1,ctx.currentTime+o);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+o+.2);osc.start(ctx.currentTime+o);osc.stop(ctx.currentTime+o+.25);})},
      delete(){const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(350,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+.15);g.gain.setValueAtTime(.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.2)},
      click(){const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='sine';osc.frequency.value=700;g.gain.setValueAtTime(.06,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.06);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.07)},
      milestone(){[0,.1,.2,.34].forEach((o,i)=>{const f=[523,659,784,1047][i];const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='triangle';osc.frequency.value=f;g.gain.setValueAtTime(.11,ctx.currentTime+o);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+o+.3);osc.start(ctx.currentTime+o);osc.stop(ctx.currentTime+o+.35)})},
      unlock(){[0,.08,.16,.24,.36].forEach((o,i)=>{const f=[392,523,659,784,1047][i];const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='sine';osc.frequency.value=f;g.gain.setValueAtTime(.12,ctx.currentTime+o);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+o+.25);osc.start(ctx.currentTime+o);osc.stop(ctx.currentTime+o+.3)})},
      chat(){const osc=ctx.createOscillator(),g=ctx.createGain();osc.connect(g);g.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(1100,ctx.currentTime+.05);g.gain.setValueAtTime(.07,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.1);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.12)},
    };
    plays[type]&&plays[type]();setTimeout(()=>ctx.close(),800);
  }catch(e){}
}


function showPtsPopup(pts,x,y){const el=document.createElement('div');el.className='pts-pop';el.textContent=`+${pts}`;el.style.left=(x-24)+'px';el.style.top=(y-16)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),1500)}
function confetti(n=30){
  const cols=['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#3B82F6'];
  for(let i=0;i<n;i++){const el=document.createElement('div');el.className='confetti-piece';el.style.cssText=`left:${35+Math.random()*30}%;top:-10px;background:${cols[Math.floor(Math.random()*cols.length)]};animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*.5}s;transform:rotate(${Math.random()*360}deg)`;document.body.appendChild(el);setTimeout(()=>el.remove(),4000)}
}
function showToast(msg,dur=2800){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),dur)}


function getNotifs(){return gs('NOTIFS')||[
  {id:1,icon:'🔥',text:'Alex Chen reached a 14-day streak!',time:Date.now()-7200000,read:false},
  {id:2,icon:'🏆',text:'Jordan Lee unlocked Leo character!',time:Date.now()-18000000,read:false},
  {id:3,icon:'💬',text:'Maya Singh sent you a message',time:Date.now()-3600000,read:false},
  {id:4,icon:'📌',text:'Reminder: Project deadline in 2 days',time:Date.now()-86400000,read:true},
]}
function addNotif(icon,text){const ns=getNotifs();ns.unshift({id:Date.now(),icon,text,time:Date.now(),read:false});ss('NOTIFS',ns.slice(0,20));updateNotifBadge()}
function clearNotifs(){ss('NOTIFS',[]);renderNotifList();updateNotifBadge()}
function updateNotifBadge(){
  const unread=getNotifs().filter(n=>!n.read).length;
  const cnt=document.getElementById('topbar-notif-count');
  cnt.textContent=unread>9?'9+':unread;cnt.style.display=unread?'flex':'none';
}
function toggleNotif(e){
  e.stopPropagation();
  const ov=document.getElementById('notif-overlay');const dd=document.getElementById('notif-dd');
  if(dd.classList.contains('open')){closeNotif();return;}
  renderNotifList();ov.classList.add('open');dd.classList.add('open');
  const ns=getNotifs();ns.forEach(n=>n.read=true);ss('NOTIFS',ns);setTimeout(updateNotifBadge,300);
}
function closeNotif(){document.getElementById('notif-overlay').classList.remove('open');document.getElementById('notif-dd').classList.remove('open')}
function renderNotifList(){
  const list=document.getElementById('notif-list');const ns=getNotifs();list.innerHTML='';
  if(!ns.length){list.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--muted)">No notifications</div>';return}
  ns.forEach(n=>{const ago=Date.now()-n.time;const str=ago<3600000?Math.round(ago/60000)+'m':ago<86400000?Math.round(ago/3600000)+'h':Math.round(ago/86400000)+'d';list.innerHTML+=`<div class="notif-item"><div class="notif-icon">${n.icon}</div><div class="notif-body"><div class="notif-text">${n.text}</div><div class="notif-time">${str} ago</div></div>${!n.read?'<div class="notif-unread"></div>':''}</div>`})
}


function getStreak(){return gs('STREAK')||{lastDate:null,count:0,shields:0}}
function getScore(){return gs('SCORE')||{total:0,activeChar:'neko'}}
function getCharState(){return gs('CHARS')||{unlocked:['neko']}}
function getCharBonus(){const sc=getScore(),cc=getCharState();if(!cc.unlocked.includes(sc.activeChar))return 0;return(CHARACTERS.find(c=>c.id===sc.activeChar)||{bonusVal:0}).bonusVal}

function awardPoints(pts,x,y){
  const bonus=getCharBonus();const actual=Math.round(pts*(1+bonus));
  const sc=getScore();const old=sc.total;sc.total+=actual;ss('SCORE',sc);
  checkCharUnlocks(old,sc.total);updateStreakUI();
  if(x!=null)showPtsPopup(actual,x,y);return actual;
}
function checkCharUnlocks(old,nw){
  const cc=getCharState();
  CHARACTERS.forEach(ch=>{if(ch.pts>old&&ch.pts<=nw&&!cc.unlocked.includes(ch.id)){cc.unlocked.push(ch.id);ss('CHARS',cc);setTimeout(()=>showCharUnlock(ch),700)}});
}
function showCharUnlock(ch){
  beep('unlock');confetti(40);
  showModal({title:'Character Unlocked! 🎉',body:`<div class="char-unlock-card"><span class="char-unlock-emoji">${ch.emoji}</span><div style="font-size:16px;font-weight:700;margin-top:8px">${ch.name}</div><div class="char-rarity r-${ch.rarity}" style="font-size:11px;margin-top:3px">${ch.rarity}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${ch.bonus} passive bonus</div></div>`,btn:'Activate in Profile'});
  addNotif('🎉',`You unlocked ${ch.name}!`);
}

function checkDayStreak(){
  const ts=fmtDate(new Date());let s=getStreak();
  if(s.lastDate===ts)return;
  const prev=s.count;
  const yest=new Date();yest.setDate(yest.getDate()-1);
  if(s.lastDate===fmtDate(yest)){
    s.count+=1;if(s.count===5||s.count===10){s.shields=(s.shields||0)+1;showToast('🛡️ Streak Shield earned!');addNotif('🛡️','You earned a Streak Shield!')}
  } else if(s.lastDate){
    if(s.shields>0){s.shields--;s.count+=1;showToast('🛡️ Shield used! Streak saved!')}
    else s.count=1;
  } else s.count=1;
  s.lastDate=ts;ss('STREAK',s);
  const dayPts=DAY_POINTS[Math.min(s.count,10)];
  const om=Math.floor(prev/10),nm=Math.floor(s.count/10);
  if(nm>om)setTimeout(()=>{beep('milestone');showMilestonePopup(s.count,(nm-om)*1000);addNotif('🏆',`${s.count}-day streak! +${(nm-om)*1000} pts`);},700);
  awardPoints(dayPts,null,null);updateStreakUI();
}
function updateStreakUI(){
  const s=getStreak(),sc=getScore();
  document.getElementById('sb-streak-val').textContent=s.count;
  const total=(sc.total||0).toLocaleString();
  document.getElementById('sb-pts').textContent=total+' pts';
  document.getElementById('sb-streak-fill').style.width=((s.count%10)/10*100)+'%';
  const tn=10-(s.count%10);document.getElementById('sb-streak-next').textContent=tn===10&&s.count>0?`🎯 Milestone: ${s.count+10}d`:`${tn}d to +1k pts ⭐`;
  document.getElementById('sb-fire').textContent=s.count>=30?'🔥🔥🔥':s.count>=20?'🔥🔥':'🔥';
  const level=Math.floor((sc.total||0)/500)+1;
  document.getElementById('sb-lvl').textContent=`Level ${level}`;
  const ac=CHARACTERS.find(c=>c.id===sc.activeChar)||CHARACTERS[0];
  // Only set emoji avatar if no Google photo is loaded
  const avEl=document.getElementById('sb-av');
  if(avEl&&!avEl.querySelector('img'))avEl.textContent=ac.emoji;
}
function showMilestonePopup(days,pts){
  document.getElementById('mp-title').textContent=`${days}-Day Streak! 🎉`;
  document.getElementById('mp-sub').textContent=`You've scheduled for ${days} consecutive days!`;
  document.getElementById('mp-score').textContent=`+${pts.toLocaleString()} pts`;
  document.getElementById('milestone-popup').classList.add('show');
}
function closeMilestone(){document.getElementById('milestone-popup').classList.remove('show')}


let bizViewMode='week';
function getEventPoint(e){const t=e.touches&&e.touches[0]||e.changedTouches&&e.changedTouches[0]||e;return {clientX:t.clientX,clientY:t.clientY};}

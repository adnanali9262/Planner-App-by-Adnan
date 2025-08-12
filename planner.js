// planner.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ====== PASTE YOUR FIREBASE CONFIG BELOW ====== */
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};
/* ============================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const leftDate = document.getElementById('leftDate');
const leftTime = document.getElementById('leftTime');
const slotLabel = document.getElementById('slotLabel');
const slotSub = document.getElementById('slotSub');
const noteEl = document.getElementById('note');
const followEl = document.getElementById('followup');
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');
const recentList = document.getElementById('recentList');
const upcomingList = document.getElementById('upcomingList');

let currentUser = null;

// ---- Helper: round down to nearest 10 minutes ----
function roundDown10(d){
  const dt = new Date(d);
  const m = dt.getMinutes();
  const m10 = Math.floor(m / 10) * 10;
  dt.setMinutes(m10, 0, 0);
  return dt;
}
function formatDateLong(d){
  return d.toLocaleDateString() + ' • ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

// ---- Left panel live clock (updates display only when rounded time changes) ----
let lastRounded = null;
function updateLeftClock(){
  const now = new Date();
  const rounded = roundDown10(now);
  if(!lastRounded || rounded.getTime() !== lastRounded.getTime()){
    lastRounded = rounded;
    leftDate.textContent = rounded.toLocaleDateString();
    leftTime.textContent = rounded.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    slotLabel.textContent = leftTime.textContent;
    slotSub.textContent = 'You can save a note for this slot only';
  }
}
updateLeftClock();
setInterval(updateLeftClock, 5000); // check every 5s (fast enough)

// ---- Auth check ----
onAuthStateChanged(auth, user => {
  if(!user){ // not signed in -> go back to login
    location.href = 'index.html';
    return;
  }
  currentUser = user;
  startRealtimeLists();
});

// ---- Save note: only for current rounded slot ----
saveBtn.addEventListener('click', async () => {
  if(!currentUser) { alert('Not signed in'); return; }
  const note = noteEl.value.trim();
  const followRaw = followEl.value;
  // compute slotTime as rounded current time
  const slotTime = roundDown10(new Date());
  // only allow saving to current slotTime (guaranteed)
  const payload = {
    uid: currentUser.uid,
    note,
    savedAt: new Date().toISOString(),
    slotTime: slotTime.toISOString(),
    followUp: followRaw ? new Date(followRaw).toISOString() : null,
    // metadata
  };
  try {
    await addDoc(collection(db, 'notes'), payload);
    saveMsg.textContent = 'Saved';
    setTimeout(()=> saveMsg.textContent = '', 1800);
    noteEl.value = '';
    followEl.value = '';
  } catch(e){
    console.error(e); alert('Save failed: '+e.message);
  }
});

// ---- Realtime lists: recent notes and upcoming follow-ups ----
let recentUnsub = null, upcomingUnsub = null;
function startRealtimeLists(){
  // recent notes: latest 20 by savedAt
  const recentQ = query(collection(db, 'notes'), where('uid','==', currentUser.uid), orderBy('savedAt','desc'), limit(30));
  if(recentUnsub) recentUnsub();
  recentUnsub = onSnapshot(recentQ, snapshot => {
    recentList.innerHTML = '';
    snapshot.forEach(doc => {
      const d = doc.data();
      recentList.appendChild(renderNoteItem(d));
    });
  });

  // upcoming follow-ups: followUp >= now, order asc
  const nowISO = new Date().toISOString();
  const upcomingQ = query(collection(db, 'notes'), where('uid','==', currentUser.uid), where('followUp','!=', null), orderBy('followUp','asc'), limit(50));
  if(upcomingUnsub) upcomingUnsub();
  upcomingUnsub = onSnapshot(upcomingQ, snapshot => {
    // filter client-side to only > some time (because inequality combos are limited)
    const arr = [];
    snapshot.forEach(d => {
      const data = d.data();
      if(data.followUp && new Date(data.followUp) >= new Date(0)) arr.push(data);
    });
    // sort by followUp ascending
    arr.sort((a,b) => new Date(a.followUp) - new Date(b.followUp));
    upcomingList.innerHTML = '';
    const now = new Date();
    arr.forEach(item => {
      const el = renderUpcomingItem(item, now);
      upcomingList.appendChild(el);
    });
  });
}

// Render helpers
function renderNoteItem(d){
  const el = document.createElement('div');
  el.className = 'note-item';
  const noteText = document.createElement('div');
  noteText.textContent = d.note || '(empty)';
  const meta = document.createElement('div');
  meta.className = 'note-meta';
  meta.innerHTML = `<span>${formatDateLong(new Date(d.savedAt))}</span>
                    <span class="muted">${d.followUp ? new Date(d.followUp).toLocaleString() : ''}</span>`;
  el.appendChild(noteText);
  el.appendChild(meta);
  return el;
}
function renderUpcomingItem(d, now){
  const el = document.createElement('div');
  el.className = 'note-item';
  const ft = new Date(d.followUp);
  const diff = ft - now;
  if(diff <= 0) el.classList.add('due-now');
  else if(diff <= (1000*60*60)) el.classList.add('due-warning'); // within 1 hour highlight
  const noteText = document.createElement('div');
  noteText.textContent = d.note || '(empty)';
  const meta = document.createElement('div');
  meta.className = 'note-meta';
  meta.innerHTML = `<span>${ft.toLocaleString()}</span><span class="muted">${formatDateLong(new Date(d.savedAt))}</span>`;
  el.appendChild(noteText);
  el.appendChild(meta);
  return el;
}

// optional: fetch initial lists once on load
// startRealtimeLists() will be called after auth detected

// cleanup on unload
window.addEventListener('beforeunload', () => {
  if(recentUnsub) recentUnsub();
  if(upcomingUnsub) upcomingUnsub();
});

// planner.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const slotsList = document.getElementById('slotsList');
const datePicker = document.getElementById('datePicker');
const userEmailEl = document.getElementById('userEmail');
const signOutBtn = document.getElementById('signOutBtn');

const slotLabel = document.getElementById('slotLabel');
const slotSub = document.getElementById('slotSub');
const noteEl = document.getElementById('note');
const followEl = document.getElementById('followup');
const priorityEl = document.getElementById('priority');
const prioVal = document.getElementById('prioVal');
const saveBtn = document.getElementById('saveBtn');

const alarmRow = document.getElementById('alarmRow');
const ackBtn = document.getElementById('ackBtn');
const snoozeBtn = document.getElementById('snoozeBtn');
const snoozeSlider = document.getElementById('snoozeSlider');
const snoozeVal = document.getElementById('snoozeVal');

let currentUser = null;
let currentDateStr = getDateKey(new Date());
let entries = {}; // loaded day entries
let selectedIndex = null;
let autosaveTimer = null;

// build time labels
const times = []; // 48 labels
for(let h=0; h<24; h++){
  for(let m=0; m<60; m+=30){
    times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }
}

// initialize date picker default to today
datePicker.value = currentDateStr;
datePicker.addEventListener('change', () => {
  currentDateStr = datePicker.value;
  if(currentUser) loadDay(currentUser.uid, currentDateStr);
});

// auth
onAuthStateChanged(auth, user => {
  if(!user) { location.href = 'index.html'; return; }
  currentUser = user;
  userEmailEl.textContent = user.email;
  // populate slots list and load data
  buildSlotsList();
  loadDay(user.uid, currentDateStr);
});

// sign out
signOutBtn.addEventListener('click', async () => {
  await signOut(auth);
  location.href = 'index.html';
});

// build left selector
function buildSlotsList(){
  slotsList.innerHTML = '';
  const now = new Date();
  const curIndex = Math.floor((now.getHours()*60 + now.getMinutes())/30);
  times.forEach((t, idx) => {
    const item = document.createElement('div');
    item.className = 'slot-item';
    item.dataset.idx = idx;
    item.innerHTML = `<div>${t}</div><div class="muted" id="small-${idx}"></div>`;
    item.addEventListener('click', () => selectSlot(idx, true));
    if(idx === curIndex) item.classList.add('active');
    slotsList.appendChild(item);
  });
}

// select slot: if explicitClick true means user chose it
function selectSlot(idx, explicitClick=false){
  // by default, only current time slot is editable; explicit click allows editing others
  const now = new Date();
  const currentIndex = Math.floor((now.getHours()*60 + now.getMinutes())/30);
  const allowEdit = explicitClick || idx === currentIndex;

  selectedIndex = idx;
  // update UI
  document.querySelectorAll('.slot-item').forEach(el => el.classList.toggle('active', Number(el.dataset.idx)===idx));
  slotLabel.textContent = times[idx];
  slotSub.textContent = allowEdit ? 'Editable' : 'Read-only (click here to edit)';
  noteEl.disabled = !allowEdit;
  followEl.disabled = !allowEdit;
  priorityEl.disabled = !allowEdit;
  saveBtn.disabled = !allowEdit;

  // load entry values
  const e = entries[idx] || { note:'', follow:null, priority:5, acknowledged:false };
  noteEl.value = e.note || '';
  followEl.value = e.follow || '';
  priorityEl.value = e.priority ?? 5;
  prioVal.textContent = priorityEl.value;

  // update small label in sidebar
  const small = document.getElementById(`small-${idx}`);
  if(small) small.textContent = e.follow ? new Date(e.follow).toLocaleString() : '';

  // show alarm UI if due and not ack
  updateAlarmUIForEntry(idx, e);
}

// load the day's entries from Firestore
async function loadDay(uid, dateKey){
  entries = {};
  // doc path: planners/{uid}/days/{dateKey}
  const docRef = doc(db, 'planners', uid, 'days', dateKey);
  const snap = await getDocSafe(docRef);
  if(snap) {
    Object.assign(entries, snap);
  }
  // show small labels and initial selection
  times.forEach((t, idx) => {
    const small = document.getElementById(`small-${idx}`);
    if(small) small.textContent = entries[idx]?.follow ? new Date(entries[idx].follow).toLocaleString() : '';
    const item = document.querySelector(`.slot-item[data-idx='${idx}']`);
    if(item) {
      item.classList.toggle('due', isDue(entries[idx]));
    }
  });

  // select current slot by default
  const now = new Date();
  const curIdx = Math.floor((now.getHours()*60 + now.getMinutes())/30);
  selectSlot(curIdx, false);

  // realtime: subscribe changes on the doc
  const docRef2 = doc(db, 'planners', uid, 'days', dateKey);
  // onSnapshot would require variable unsubscribe; for simplicity we re-load periodically and on save
}

// helper to safely get doc data
async function getDocSafe(docRef){
  try {
    const d = await getDoc(docRef);
    if(d.exists()) return d.data();
    return null;
  }catch(e){
    console.error('getDoc error', e);
    return null;
  }
}

// save current slot (debounced support)
saveBtn.addEventListener('click', saveSelectedSlot);
function scheduleSave(){
  if(autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveSelectedSlot, 700);
}
noteEl.addEventListener('input', scheduleSave);
followEl.addEventListener('change', scheduleSave);
priorityEl.addEventListener('input', () => { prioVal.textContent = priorityEl.value; scheduleSave(); });

// save function writes full day doc merging only changed fields
async function saveSelectedSlot(){
  if(selectedIndex === null || currentUser === null) return;
  const idx = selectedIndex;
  const note = noteEl.value;
  const follow = followEl.value || null;
  const priority = Number(priorityEl.value);
  entries[idx] = { note, follow, priority, acknowledged: entries[idx]?.acknowledged || false };

  const docRef = doc(db, 'planners', currentUser.uid, 'days', currentDateStr);
  // build object with only changed keys to merge
  const payload = {};
  payload[`entries.${idx}`] = entries[idx];
  payload.updatedAt = serverTimestamp();
  try {
    await updateDoc(docRef, payload);
  } catch(e) {
    // if update fails (doc not exist), set entire doc
    const full = { entries: entries, updatedAt: serverTimestamp() };
    await setDoc(docRef, full);
  }
  // update UI small label
  const small = document.getElementById(`small-${idx}`);
  if(small) small.textContent = follow ? new Date(follow).toLocaleString() : '';
  document.querySelector(`.slot-item[data-idx='${idx}']`)?.classList.toggle('due', isDue(entries[idx]));
}

// isDue check
function isDue(entry){
  if(!entry || !entry.follow) return false;
  if(entry.acknowledged) return false;
  const t = new Date(entry.follow).getTime();
  return t <= Date.now();
}

// alarm UI
function updateAlarmUIForEntry(idx, entry){
  const due = isDue(entry);
  if(due){
    alarmRow.style.display = 'flex';
    ackBtn.disabled = false;
    snoozeBtn.disabled = false;
  } else {
    alarmRow.style.display = 'none';
  }
}

// ack button
ackBtn.addEventListener('click', async () => {
  if(selectedIndex === null) return;
  entries[selectedIndex].acknowledged = true;
  await saveSelectedSlot();
  updateAlarmUIForEntry(selectedIndex, entries[selectedIndex]);
});

// snooze slider
snoozeSlider.addEventListener('input', () => { snoozeVal.textContent = snoozeSlider.value; });
snoozeBtn.addEventListener('click', async () => {
  if(selectedIndex === null) return;
  const mins = Number(snoozeSlider.value);
  const now = new Date();
  now.setMinutes(now.getMinutes() + mins);
  entries[selectedIndex].follow = now.toISOString();
  entries[selectedIndex].acknowledged = false;
  await saveSelectedSlot();
  alert(`Snoozed ${mins} minutes`);
  updateAlarmUIForEntry(selectedIndex, entries[selectedIndex]);
});

// periodic alarm checker
setInterval(async () => {
  if(!currentUser) return;
  // refresh day doc
  const docRef = doc(db, 'planners', currentUser.uid, 'days', currentDateStr);
  const snap = await getDocSafe(docRef);
  if(snap && snap.entries) {
    entries = snap.entries;
    // update small labels and due badges
    times.forEach((t, idx) => {
      const item = document.querySelector(`.slot-item[data-idx='${idx}']`);
      if(item) item.classList.toggle('due', isDue(entries[idx]));
      if(selectedIndex === idx) updateAlarmUIForEntry(idx, entries[idx]);
      const small = document.getElementById(`small-${idx}`);
      if(small) small.textContent = entries[idx]?.follow ? new Date(entries[idx].follow).toLocaleString() : '';
    });
    // if selected slot due -> show
    if(selectedIndex !== null && isDue(entries[selectedIndex])) {
      updateAlarmUIForEntry(selectedIndex, entries[selectedIndex]);
      // show notification
      tryNotifyIfNeeded();
    }
  }
}, 20000);

// browser notification (will ask permission)
async function tryNotifyIfNeeded(){
  if(!("Notification" in window)) return;
  if(Notification.permission === 'granted') {
    new Notification('Planner: follow-up due', { body: `${slotLabel.textContent} is due.` });
  } else if(Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    if(p === 'granted') tryNotifyIfNeeded();
  }
}

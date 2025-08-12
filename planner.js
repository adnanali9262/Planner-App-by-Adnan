// planner.js - REPLACE your current planner.js with this file
// Uses modular Firebase SDK (CDN). Matches IDs in planner.html:
// currentDateTime, logoutBtn, noteInput, followUpInput, saveNoteBtn,
// recentNotes, upcomingNotes

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== YOUR FIREBASE CONFIG (kept as you provided) ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};
/* ====================================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM refs (must match planner.html)
const currentDateTimeEl = document.getElementById("currentDateTime");
const logoutBtn = document.getElementById("logoutBtn");
const noteInput = document.getElementById("noteInput");
const followUpInput = document.getElementById("followUpInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const recentNotesEl = document.getElementById("recentNotes");
const upcomingNotesEl = document.getElementById("upcomingNotes");

if (!currentDateTimeEl || !noteInput || !followUpInput || !saveNoteBtn || !recentNotesEl || !upcomingNotesEl) {
  console.error("planner.js: Required DOM element(s) not found. Check element IDs in planner.html");
}

// show current date & time (every second)
function updateClock() {
  const now = new Date();
  currentDateTimeEl.textContent = now.toLocaleString();
}
updateClock();
setInterval(updateClock, 1000);

// Sign out handler
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Sign out error:", err);
    alert("Sign out failed.");
  }
});

let unsubRecent = null;
let unsubUpcoming = null;

// Auth watcher
onAuthStateChanged(auth, user => {
  if (!user) {
    console.log("Not signed in — redirecting to login");
    window.location.href = "index.html";
    return;
  }
  console.log("Signed in as:", user.uid, user.email);
  startRealtimeListeners(user.uid);
});

// Save note
saveNoteBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Not signed in.");
    return;
  }

  const text = (noteInput.value || "").trim();
  if (!text) {
    alert("Please enter a note before saving.");
    return;
  }

  // build followUp as Firestore Timestamp or null
  const followRaw = followUpInput.value;
  const followTs = followRaw ? Timestamp.fromDate(new Date(followRaw)) : null;

  const payload = {
    userId: user.uid,
    text,
    followUp: followTs,
    createdAt: serverTimestamp()
  };

  try {
    console.log("Saving note...", payload);
    await addDoc(collection(db, "notes"), payload);
    noteInput.value = "";
    followUpInput.value = "";
    console.log("Saved successfully.");
  } catch (err) {
    console.error("Error saving note:", err);
    alert("Save failed: " + (err.message || err));
  }
});

// start realtime listeners for recent & upcoming
function startRealtimeListeners(uid) {
  // unsubscribe previous if present
  if (unsubRecent) unsubRecent();
  if (unsubUpcoming) unsubUpcoming();

  // Recent notes (latest first)
  try {
    const recentQ = query(
      collection(db, "notes"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    unsubRecent = onSnapshot(recentQ, snapshot => {
      recentNotesEl.innerHTML = "";
      snapshot.forEach(doc => {
        const d = doc.data();
        // createdAt may be a Firestore Timestamp or missing (pending)
        const created = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null;
        const createdStr = created ? created.toLocaleString() : "(just now)";
        const card = document.createElement("div");
        card.className = "note-card";
        card.innerHTML = `<div class="note-text">${escapeHtml(d.text)}</div>
                          <div class="note-meta">${escapeHtml(createdStr)}${d.followUp ? " • Follow: " + escapeHtml(displayFollow(d.followUp)) : ""}</div>`;
        recentNotesEl.appendChild(card);
      });
    }, err => {
      console.error("recent onSnapshot error:", err);
    });
  } catch (err) {
    console.error("Failed to subscribe recent notes:", err);
  }

  // Upcoming follow-ups (soonest first) — order by followUp asc and filter client-side for non-null
  try {
    const upcomingQ = query(
      collection(db, "notes"),
      where("userId", "==", uid),
      orderBy("followUp", "asc")
    );
    unsubUpcoming = onSnapshot(upcomingQ, snapshot => {
      upcomingNotesEl.innerHTML = "";
      const now = new Date();
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.followUp) return; // skip items without followUp
        const f = d.followUp.toDate ? d.followUp.toDate() : new Date(d.followUp);
        const card = document.createElement("div");
        card.className = "note-card" + (f <= now ? " overdue" : (f - now < 1000*60*60 ? " due-soon" : ""));
        card.innerHTML = `<div class="note-text">${escapeHtml(d.text)}</div>
                          <div class="note-meta">${escapeHtml(f.toLocaleString())} • ${escapeHtml(d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : "(saved)")}</div>`;
        upcomingNotesEl.appendChild(card);
      });
    }, err => {
      console.error("upcoming onSnapshot error:", err);
    });
  } catch (err) {
    console.error("Failed to subscribe upcoming follow-ups:", err);
  }
}

// small helper: display follow field whether Timestamp or string
function displayFollow(f) {
  if (!f) return "";
  if (f.toDate) return f.toDate().toLocaleString();
  try { return new Date(f).toLocaleString(); } catch(e){ return String(f); }
}

// escape HTML to avoid XSS when rendering note text
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const currentDateTimeEl = document.getElementById("currentDateTime");
const logoutBtn = document.getElementById("logoutBtn");
const noteInput = document.getElementById("noteInput");
const followUpInput = document.getElementById("followUpInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const recentNotesContainer = document.getElementById("recentNotes");
const upcomingNotesContainer = document.getElementById("upcomingNotes");

// Tab switching
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Show current date & time
setInterval(() => {
  const now = new Date();
  currentDateTimeEl.textContent = now.toLocaleString();
}, 1000);

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadNotes(user.uid);
  }
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));

// Save note
saveNoteBtn.addEventListener("click", async () => {
  const note = noteInput.value.trim();
  const followUp = followUpInput.value;
  if (!note) return alert("Please enter a note");

  await addDoc(collection(db, "notes"), {
    uid: auth.currentUser.uid,
    text: note,
    createdAt: new Date(),
    followUp: followUp ? new Date(followUp) : null
  });

  noteInput.value = "";
  followUpInput.value = "";
});

// Load notes in real-time
function loadNotes(uid) {
  const q = query(
    collection(db, "notes"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snapshot => {
    recentNotesContainer.innerHTML = "";
    upcomingNotesContainer.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();

      // Recent Notes
      const noteDiv = document.createElement("div");
      noteDiv.classList.add("note-card");
      noteDiv.innerHTML = `<strong>${new Date(data.createdAt.seconds * 1000).toLocaleString()}</strong><br>${data.text}`;
      recentNotesContainer.appendChild(noteDiv);

      // Upcoming
      if (data.followUp) {
        const followDate = new Date(data.followUp.seconds * 1000);
        const upDiv = document.createElement("div");
        upDiv.classList.add("note-card");
        if (followDate < new Date()) upDiv.classList.add("overdue");
        upDiv.innerHTML = `<strong>${followDate.toLocaleString()}</strong><br>${data.text}`;
        upcomingNotesContainer.appendChild(upDiv);
      }
    });
  });
}

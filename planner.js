// planner.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.firebasestorage.app",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI elements
const noteInput = document.getElementById("noteInput");
const followUpInput = document.getElementById("followUpInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const recentNotesDiv = document.getElementById("recentNotes");
const upcomingNotesDiv = document.getElementById("upcomingNotes");
const logoutBtn = document.getElementById("logoutBtn");
const currentDateTimeEl = document.getElementById("currentDateTime");

// Show current date/time
function updateTime() {
  const now = new Date();
  currentDateTimeEl.textContent = now.toLocaleString();
}
setInterval(updateTime, 1000);
updateTime();

// Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadNotes(user.uid);
  }
});

// Save note
saveNoteBtn.addEventListener("click", async () => {
  const noteText = noteInput.value.trim();
  const followUpValue = followUpInput.value;
  if (!noteText) return alert("Please write a note.");

  try {
    await addDoc(collection(db, "notes"), {
      uid: auth.currentUser.uid,
      text: noteText,
      createdAt: serverTimestamp(),
      followUpAt: followUpValue ? new Date(followUpValue) : null
    });
    noteInput.value = "";
    followUpInput.value = "";
  } catch (err) {
    console.error("Error saving note:", err);
  }
});

// Load notes and separate
function loadNotes(uid) {
  const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const recentNotes = [];
    const upcomingNotes = [];
    const now = new Date();

    snapshot.forEach(doc => {
      const note = doc.data();
      if (note.uid !== uid) return;

      const createdAt = note.createdAt?.toDate
        ? note.createdAt.toDate()
        : null;

      const followUpAt = note.followUpAt?.toDate
        ? note.followUpAt.toDate()
        : note.followUpAt instanceof Date
          ? note.followUpAt
          : null;

      const itemHTML = `
        <div class="note-item">
          <p>${note.text}</p>
          <small>Created: ${createdAt ? createdAt.toLocaleString() : "N/A"}</small>
          ${followUpAt ? `<small>Follow-up: ${followUpAt.toLocaleString()}</small>` : ""}
        </div>
      `;

      if (followUpAt && followUpAt > now) {
        upcomingNotes.push(itemHTML);
      } else {
        recentNotes.push(itemHTML);
      }
    });

    recentNotesDiv.innerHTML = recentNotes.join("");
    upcomingNotesDiv.innerHTML = upcomingNotes.join("");
  });
}

// Tabs
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

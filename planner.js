// planner.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === FIREBASE CONFIG (YOUR ACTUAL KEYS) ===
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const noteText = document.getElementById("note");
const followUpDateTime = document.getElementById("followUp");
const saveNoteBtn = document.getElementById("saveNote");
const recentNotesList = document.getElementById("recentNotesList");
const upcomingNotesList = document.getElementById("upcomingNotesList");
const logoutBtn = document.getElementById("logoutBtn");
const currentDateTimeEl = document.getElementById("currentDateTime");

// === Show current date/time ===
function updateDateTime() {
  const now = new Date();
  currentDateTimeEl.textContent = now.toLocaleString();
}
setInterval(updateDateTime, 1000);
updateDateTime();

// === Auth check ===
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadNotes(user.uid);
  }
});

// === Logout ===
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// === Save note ===
saveNoteBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const noteContent = noteText.value.trim();
  const followUpValue = followUpDateTime.value;

  if (!noteContent) {
    alert("Please write a note before saving.");
    return;
  }

  try {
    await addDoc(collection(db, "notes"), {
      userId: user.uid,
      note: noteContent,
      followUp: followUpValue ? new Date(followUpValue) : null,
      createdAt: serverTimestamp()
    });

    noteText.value = "";
    followUpDateTime.value = "";
  } catch (error) {
    console.error("Error saving note:", error);
    alert("Failed to save note.");
  }
});

// === Load notes real-time ===
function loadNotes(uid) {
  // Recent notes
  const recentQuery = query(
    collection(db, "notes"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(recentQuery, (snapshot) => {
    recentNotesList.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${data.note} — ${data.createdAt?.toDate().toLocaleString() || ""}`;
      recentNotesList.appendChild(li);
    });
  });

  // Upcoming follow-ups
  const upcomingQuery = query(
    collection(db, "notes"),
    where("userId", "==", uid),
    orderBy("followUp", "asc")
  );

  onSnapshot(upcomingQuery, (snapshot) => {
    upcomingNotesList.innerHTML = "";
    const now = new Date();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.followUp) {
        const followUpDate = data.followUp.toDate ? data.followUp.toDate() : new Date(data.followUp);
        const li = document.createElement("li");
        li.textContent = `${data.note} — Follow-up: ${followUpDate.toLocaleString()}`;
        if (followUpDate <= now) {
          li.style.color = "red";
        }
        upcomingNotesList.appendChild(li);
      }
    });
  });
}

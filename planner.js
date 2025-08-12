import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.firebasestorage.app",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Update clock
function updateDateTime() {
  document.getElementById("currentDateTime").textContent = new Date().toLocaleString();
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Auth state check
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
  else loadNotes(user.uid);
});

// Save note
document.getElementById("saveNoteBtn").addEventListener("click", async () => {
  const noteText = document.getElementById("noteInput").value.trim();
  const followUpTime = document.getElementById("followUpTime").value;
  const user = auth.currentUser;

  if (!noteText) return alert("Please write a note.");

  await addDoc(collection(db, "notes"), {
    uid: user.uid,
    text: noteText,
    createdAt: new Date(),
    followUp: followUpTime ? new Date(followUpTime) : null
  });

  document.getElementById("noteInput").value = "";
  document.getElementById("followUpTime").value = "";
});

// Load notes
function loadNotes(uid) {
  const q = query(collection(db, "notes"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    const recentList = document.getElementById("recentNotes");
    const upcomingList = document.getElementById("upcomingFollowUps");
    recentList.innerHTML = "";
    upcomingList.innerHTML = "";

    const now = new Date();

    snapshot.forEach(doc => {
      const note = doc.data();
      const li = document.createElement("li");
      li.textContent = `${note.text} (${note.createdAt.toDate().toLocaleString()})`;
      recentList.appendChild(li);

      if (note.followUp) {
        const followUpDate = note.followUp.toDate();
        const liFollow = document.createElement("li");
        liFollow.textContent = `${note.text} - ${followUpDate.toLocaleString()}`;
        if (followUpDate <= now) liFollow.style.color = "red";
        upcomingList.appendChild(liFollow);
      }
    });
  });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

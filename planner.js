import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const plannerDiv = document.getElementById("planner");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        await loadPlanner(user.uid);
    }
});

async function loadPlanner(uid) {
    plannerDiv.innerHTML = "";
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 48; i++) {
        const time = new Date(start.getTime() + i * 30 * 60000);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const slot = document.createElement("div");
        slot.className = "slot";
        slot.innerHTML = `
            <strong>${timeStr}</strong>
            <textarea id="note-${i}" placeholder="Enter note"></textarea>
            <input type="datetime-local" id="follow-${i}">
            <button onclick="saveSlot(${i})">Save</button>
        `;
        plannerDiv.appendChild(slot);
    }

    // Load saved data
    const docRef = doc(db, "plannerData", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        for (let i = 0; i < 48; i++) {
            if (data[`note${i}`]) document.getElementById(`note-${i}`).value = data[`note${i}`];
            if (data[`follow${i}`]) document.getElementById(`follow-${i}`).value = data[`follow${i}`];
        }
    }

    // Alarm check every 30 seconds
    setInterval(() => checkAlarms(uid), 30000);
}

window.saveSlot = async function (i) {
    const uid = auth.currentUser.uid;
    const note = document.getElementById(`note-${i}`).value;
    const follow = document.getElementById(`follow-${i}`).value;
    const docRef = doc(db, "plannerData", uid);
    const docSnap = await getDoc(docRef);
    let data = {};
    if (docSnap.exists()) data = docSnap.data();
    data[`note${i}`] = note;
    data[`follow${i}`] = follow;
    await setDoc(docRef, data);
    alert("Saved!");
};

async function checkAlarms(uid) {
    const docRef = doc(db, "plannerData", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const now = new Date();
        const data = docSnap.data();
        for (let i = 0; i < 48; i++) {
            const followTime = data[`follow${i}`];
            if (followTime && new Date(followTime) <= now) {
                document.getElementById(`note-${i}`).style.background = "red";
            }
        }
    }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

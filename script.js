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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM
const authSection = document.getElementById("auth-section");
const plannerSection = document.getElementById("planner-section");
const emailField = document.getElementById("email");
const passField = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const slotsDiv = document.getElementById("slots");

let userId = null;

// Create 48 slots
function generateSlots() {
    slotsDiv.innerHTML = "";
    for (let i = 0; i < 48; i++) {
        let hour = Math.floor(i / 2);
        let minute = i % 2 === 0 ? "00" : "30";
        let time = `${hour.toString().padStart(2, '0')}:${minute}`;
        
        let slotDiv = document.createElement("div");
        slotDiv.className = "slot";
        slotDiv.id = `slot-${i}`;
        slotDiv.innerHTML = `
            <strong>${time}</strong><br>
            <input type="text" id="note-${i}" placeholder="Note">
            <input type="datetime-local" id="follow-${i}">
            <button onclick="saveSlot(${i})">Save</button>
        `;
        slotsDiv.appendChild(slotDiv);
    }
}

// Save slot to Firestore
function saveSlot(i) {
    let note = document.getElementById(`note-${i}`).value;
    let follow = document.getElementById(`follow-${i}`).value;

    db.collection("users").doc(userId).collection("slots").doc(`${i}`).set({
        note: note,
        follow: follow
    });
}

// Load slots from Firestore
function loadSlots() {
    db.collection("users").doc(userId).collection("slots").get().then(snapshot => {
        snapshot.forEach(doc => {
            let data = doc.data();
            let i = doc.id;
            document.getElementById(`note-${i}`).value = data.note || "";
            document.getElementById(`follow-${i}`).value = data.follow || "";
        });
    });
}

// Check alarms every minute
setInterval(() => {
    let now = new Date();
    db.collection("users").doc(userId).collection("slots").get().then(snapshot => {
        snapshot.forEach(doc => {
            let follow = doc.data().follow;
            if (follow) {
                let followDate = new Date(follow);
                let slotDiv = document.getElementById(`slot-${doc.id}`);
                if (followDate <= now) {
                    slotDiv.classList.add("alarm");
                } else {
                    slotDiv.classList.remove("alarm");
                }
            }
        });
    });
}, 60000);

// Auth
loginBtn.onclick = () => {
    auth.signInWithEmailAndPassword(emailField.value, passField.value)
        .catch(err => alert(err.message));
};

registerBtn.onclick = () => {
    auth.createUserWithEmailAndPassword(emailField.value, passField.value)
        .catch(err => alert(err.message));
};

logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(user => {
    if (user) {
        userId = user.uid;
        authSection.style.display = "none";
        plannerSection.style.display = "block";
        generateSlots();
        loadSlots();
    } else {
        authSection.style.display = "block";
        plannerSection.style.display = "none";
        userId = null;
    }
});

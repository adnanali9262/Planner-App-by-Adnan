// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.firebasestorage.app",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth Elements
const loginContainer = document.getElementById("login-container");
const plannerContainer = document.getElementById("planner-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMsg = document.getElementById("auth-msg");

// Login
loginBtn.onclick = () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMsg.textContent = err.message);
};

// Register
registerBtn.onclick = () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMsg.textContent = err.message);
};

// Logout
logoutBtn.onclick = () => auth.signOut();

// Listen for Auth Changes
auth.onAuthStateChanged(user => {
  if (user) {
    loginContainer.style.display = "none";
    plannerContainer.style.display = "block";
    loadSlots(user.uid);
  } else {
    loginContainer.style.display = "block";
    plannerContainer.style.display = "none";
  }
});

// Create 48 slots
function loadSlots(uid) {
  const slotsDiv = document.getElementById("slots");
  slotsDiv.innerHTML = "";
  for (let i = 0; i < 48; i++) {
    const hour = String(Math.floor(i / 2)).padStart(2, "0");
    const minute = i % 2 === 0 ? "00" : "30";
    const timeLabel = `${hour}:${minute}`;
    const slotDiv = document.createElement("div");
    slotDiv.classList.add("slot");
    slotDiv.innerHTML = `
      <strong>${timeLabel}</strong>
      <textarea placeholder="Note..."></textarea>
      <input type="datetime-local" />
      <button>Save</button>
    `;
    slotsDiv.appendChild(slotDiv);

    // Load data from Firestore
    db.collection("planner").doc(uid).collection("slots").doc(timeLabel)
      .get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          slotDiv.querySelector("textarea").value = data.note || "";
          if (data.followUp) slotDiv.querySelector("input").value = data.followUp;
        }
      });

    // Save button
    slotDiv.querySelector("button").onclick = () => {
      const note = slotDiv.querySelector("textarea").value;
      const followUp = slotDiv.querySelector("input").value;
      db.collection("planner").doc(uid).collection("slots").doc(timeLabel)
        .set({ note, followUp });
    };

    // Alarm check every minute
    setInterval(() => {
      const followUpTime = slotDiv.querySelector("input").value;
      if (followUpTime && new Date(followUpTime) <= new Date()) {
        slotDiv.classList.add("red");
      }
    }, 60000);
  }
}

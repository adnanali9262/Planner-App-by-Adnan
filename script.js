import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    document.getElementById("status").innerText = error.message;
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    document.getElementById("status").innerText = error.message;
  }
});

// If logged in, go to planner
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "/Planner-App-by-Adnan/planner.html";
  }
});

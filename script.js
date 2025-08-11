// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Register button click
document.getElementById("registerBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert(`Registration successful: ${userCredential.user.email}`);
    })
    .catch(error => {
      alert(error.message);
    });
});

// Login button click
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert(`Login successful: ${userCredential.user.email}`);
    })
    .catch(error => {
      alert(error.message);
    });
});

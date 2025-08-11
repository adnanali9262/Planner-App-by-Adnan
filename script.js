// script.js (auth + redirect)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ====== PASTE YOUR FIREBASE CONFIG BELOW ====== */
const firebaseConfig = {
  apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
  authDomain: "planner-project-87612.firebaseapp.com",
  projectId: "planner-project-87612",
  storageBucket: "planner-project-87612.appspot.com",
  messagingSenderId: "625352854092",
  appId: "1:625352854092:web:ec816304828365d727c2e9"
};
/* ============================================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authMsg = document.getElementById('authMsg');

loginBtn.addEventListener('click', async () => {
  authMsg.textContent = '';
  const email = emailEl.value.trim(), password = passEl.value.trim();
  if(!email || !password){ authMsg.textContent = 'Provide email & password'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles redirect
  } catch (err) { authMsg.textContent = err.message; }
});

registerBtn.addEventListener('click', async () => {
  authMsg.textContent = '';
  const email = emailEl.value.trim(), password = passEl.value.trim();
  if(!email || !password){ authMsg.textContent = 'Provide email & password'; return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) { authMsg.textContent = err.message; }
});

// Redirect when logged in
onAuthStateChanged(auth, user => {
  if(user){
    // use absolute path so GitHub Pages works regardless of repo folder
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, '/');
    // If hosted under repo path, keep relative root. Simpler: use relative planner.html
    window.location.href = 'planner.html';
  }
});

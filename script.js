// Firebase config (your own)
const firebaseConfig = {
    apiKey: "AIzaSyAdT__ih2Cpx63eelLR3fkZuOp_XCdNc3k",
    authDomain: "planner-project-87612.firebaseapp.com",
    projectId: "planner-project-87612",
    storageBucket: "planner-project-87612.appspot.com",
    messagingSenderId: "625352854092",
    appId: "1:625352854092:web:ec816304828365d727c2e9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('authMessage');
const plannerSection = document.getElementById('planner-section');
const authSection = document.getElementById('auth-section');
const slotsContainer = document.getElementById('slots');

// Create 48 slots
function createSlots() {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < 48; i++) {
        let hour = Math.floor(i / 2);
        let minute = (i % 2) * 30;
        let timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        let slotDiv = document.createElement('div');
        slotDiv.className = 'slot';
        slotDiv.dataset.time = timeLabel;

        let label = document.createElement('span');
        label.textContent = timeLabel;

        let input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Note...';

        let followUpInput = document.createElement('input');
        followUpInput.type = 'datetime-local';

        input.addEventListener('change', () => saveSlot(timeLabel, input.value, followUpInput.value));
        followUpInput.addEventListener('change', () => saveSlot(timeLabel, input.value, followUpInput.value));

        slotDiv.appendChild(label);
        slotDiv.appendChild(input);
        slotDiv.appendChild(followUpInput);
        slotsContainer.appendChild(slotDiv);
    }
}

// Save slot to Firestore
function saveSlot(time, note, followUp) {
    const user = auth.currentUser;
    if (!user) return;
    db.collection('planners').doc(user.uid).collection('days').doc(new Date().toDateString())
        .set({
            [time]: { note, followUp }
        }, { merge: true });
}

// Load slots from Firestore
function loadSlots() {
    const user = auth.currentUser;
    if (!user) return;
    db.collection('planners').doc(user.uid).collection('days').doc(new Date().toDateString())
        .onSnapshot(doc => {
            createSlots();
            const data = doc.data();
            if (data) {
                document.querySelectorAll('.slot').forEach(slot => {
                    const time = slot.dataset.time;
                    if (data[time]) {
                        slot.querySelector('input[type="text"]').value = data[time].note || '';
                        slot.querySelector('input[type="datetime-local"]').value = data[time].followUp || '';

                        // Check for red alert
                        if (data[time].followUp && new Date(data[time].followUp) <= new Date()) {
                            slot.classList.add('red-alert');
                        } else {
                            slot.classList.remove('red-alert');
                        }
                    }
                });
            }
        });
}

// Auth listeners
loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .then(() => {
            authMessage.textContent = '';
        })
        .catch(err => {
            authMessage.textContent = err.message;
        });
});

registerBtn.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .then(() => {
            authMessage.textContent = '';
        })
        .catch(err => {
            authMessage.textContent = err.message;
        });
});

auth.onAuthStateChanged(user => {
    if (user) {
        authSection.style.display = 'none';
        plannerSection.style.display = 'block';
        loadSlots();
    } else {
        authSection.style.display = 'block';
        plannerSection.style.display = 'none';
    }
});

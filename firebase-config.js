// ===== إعدادات Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    setDoc,
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    increment,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ===== مفاتيح Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyDKJY48lgFjUBPNKQUlpaYWdVjhoJWOb-0",
    authDomain: "medicino-iraq.firebaseapp.com",
    projectId: "medicino-iraq",
    storageBucket: "medicino-iraq.firebasestorage.app",
    messagingSenderId: "1014374515845",
    appId: "1:1014374515845:web:837f817b88e5be5550d5ec",
    measurementId: "G-08BSWB2RJR"
};

// ===== تهيئة Firebase =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== تصدير للاستخدام في ملفات أخرى =====
export { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    collection, 
    doc, 
    addDoc, 
    setDoc,
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    increment,
    serverTimestamp 
};

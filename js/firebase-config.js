// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4IrpwEH7SSerMCIxXFdJhzqqZOBfMEWI",
  authDomain: "the-peoples-butchery.firebaseapp.com",
  projectId: "the-peoples-butchery",
  storageBucket: "the-peoples-butchery.firebasestorage.app",
  messagingSenderId: "963040282929",
  appId: "1:963040282929:web:80f56e542f506d9d70c810",
  measurementId: "G-D1E4NHKWGW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

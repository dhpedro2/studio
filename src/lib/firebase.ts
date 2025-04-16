"use client";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA",
    authDomain: "bank-dh.firebaseapp.com",
    projectId: "bank-dh",
    storageBucket: "bank-dh.firebasestorage.app",
    messagingSenderId: "370634468884",
    appId: "1:370634468884:web:4a00ea2f9757051cda4101",
    measurementId: "G-JPFXDJBSGM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

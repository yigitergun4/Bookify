import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-4JM54CZZJlfXMQzf7W_YEHt_NIjyPbw",
  authDomain: "bookify-98949.firebaseapp.com",
  projectId: "bookify-98949",
  storageBucket: "bookify-98949.firebasestorage.app",
  messagingSenderId: "78369109206",
  appId: "1:78369109206:web:b2fe28483c217060e90577",
  measurementId: "G-J3M938J8KK",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
// Initialize Firebase
export const FIREBASE_APP = app;
export const FIREBASE_AUTH = auth;
export const FIREBASE_ANALYTICS = getAnalytics(app);
export const FIREBASE_DB = getFirestore(app);
export const FIREBASE_STORAGE = getStorage(app);

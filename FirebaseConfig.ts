// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-4JM54CZZJlfXMQzf7W_YEHt_NIjyPbw",
  authDomain: "bookify-98949.firebaseapp.com",
  projectId: "bookify-98949",
  storageBucket: "bookify-98949.firebasestorage.app",
  messagingSenderId: "78369109206",
  appId: "1:78369109206:web:b2fe28483c217060e90577",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase
export const FIREBASE_APP = app;
export const FIREBASE_AUTH = getAuth(app);
export const FIREBASE_ANALYTICS = getAnalytics(app);
export const FIREBASE_DB = getFirestore(app);

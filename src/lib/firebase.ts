import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCWifYqXuUfmes9nbCltvFZGbsEYabZe04",
  authDomain: "trustcare-44705.firebaseapp.com",
  projectId: "trustcare-44705",
  storageBucket: "trustcare-44705.firebasestorage.app",
  messagingSenderId: "367478612703",
  appId: "1:367478612703:web:fe4f931235079c0cb1ff6a"
};

// Initialize Firebase app once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };

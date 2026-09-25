import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBbqb3PTi-ICWczxR4yKQ6k5bTW9s6_q0Y",
  authDomain: "isagismartview.firebaseapp.com",
  projectId: "isagismartview",
  storageBucket: "isagismartview.firebasestorage.app",
  messagingSenderId: "717578074426",
  appId: "1:717578074426:web:95f277d6bc016f38b0f803",
};

export const FIRESTORE_ID = "smart-view";
export const RTDB_URL = "https://smart-view.firebaseio.com";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, FIRESTORE_ID);
export const rtdb = getDatabase(app, RTDB_URL);

export default app;

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Reuses the same Firebase project already set up for Athanor.
// Leviathan uses its own top-level collections (whales, pushSubscriptions)
// so the two apps don't collide.
const firebaseConfig = {
  apiKey: "AIzaSyDcHV6RWLURbAzaK3gOk1ElpqLGMihZuCM",
  authDomain: "prompt-toolkit-df514.firebaseapp.com",
  projectId: "prompt-toolkit-df514",
  storageBucket: "prompt-toolkit-df514.firebasestorage.app",
  messagingSenderId: "14323559533",
  appId: "1:14323559533:web:0a61e3ce71bf22f28f2364",
  measurementId: "G-MLQEZ79VZG",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

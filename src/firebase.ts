import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC7izcJMAohbE9tFFPpNYMVNOCpdQbMaYA",
  authDomain: "svoo-6ab9c.firebaseapp.com",
  projectId: "svoo-6ab9c",
  storageBucket: "svoo-6ab9c.firebasestorage.app",
  messagingSenderId: "602871828262",
  appId: "1:602871828262:web:42b403a33b5e3e29a0bbe7",
  measurementId: "G-Q818ZJ6249",
  // تم تحديث الرابط للصيغة الدولية (Europe/International)
  databaseURL: "https://svoo-6ab9c-default-rtdb.europe-west1.firebasedatabase.app"
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getDatabase(app);

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyA7rB5N0hZF0qvCqqcU2cafSNNwqGtemJM",
  authDomain: "myfinance-c81b0.firebaseapp.com",
  projectId: "myfinance-c81b0",
  storageBucket: "myfinance-c81b0.firebasestorage.app",
  messagingSenderId: "189915861594",
  appId: "1:189915861594:web:a36f1d6b8e4d59d5dffe63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);

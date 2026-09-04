import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Firebase Auth has no native "mobile number + password" sign-in method
 * without SMS verification, so mobile numbers are mapped to a synthetic
 * email address and email/password auth is used underneath. Users only
 * ever see/enter the mobile number.
 */
export function mobileToSyntheticEmail(mobile: string): string {
  const normalized = mobile.replace(/\D/g, "");
  return `${normalized}@tcc-auction.app`;
}

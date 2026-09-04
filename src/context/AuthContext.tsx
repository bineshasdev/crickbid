import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, mobileToSyntheticEmail } from "../firebase";
import type { AppUser, UserRole } from "../types";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  register: (
    mobile: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    setProfile(snap.exists() ? (snap.data() as AppUser) : null);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(mobile: string, password: string) {
    await signInWithEmailAndPassword(
      auth,
      mobileToSyntheticEmail(mobile),
      password
    );
  }

  async function register(
    mobile: string,
    password: string,
    name: string,
    role: UserRole
  ) {
    const cred = await createUserWithEmailAndPassword(
      auth,
      mobileToSyntheticEmail(mobile),
      password
    );
    const newProfile: AppUser = {
      uid: cred.user.uid,
      mobile: mobile.replace(/\D/g, ""),
      name,
      role,
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...newProfile,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // Don't leave a login with no profile behind — undo the account so
      // the same mobile number can be retried cleanly.
      await deleteUser(cred.user);
      throw err;
    }
    setProfile(newProfile);
  }

  async function logout() {
    await firebaseSignOut(auth);
  }

  async function refreshProfile() {
    if (firebaseUser) await loadProfile(firebaseUser.uid);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

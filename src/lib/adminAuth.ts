import { getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { app as primaryApp, mobileToSyntheticEmail } from "../firebase";

/**
 * Firebase's client SDK signs in as whichever user it just created, which
 * would kick the coordinator out of their own session. Creating the new
 * login on an isolated secondary app instance (same project, separate
 * auth state) avoids that entirely.
 */
function secondaryAuth() {
  const secondaryApp =
    getApps().find((a) => a.name === "secondary") ??
    initializeApp(primaryApp.options, "secondary");
  return getAuth(secondaryApp);
}

/** Creates a manager's login without disturbing the caller's own session. */
export async function createManagerLogin(mobile: string, password: string) {
  const auth = secondaryAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    mobileToSyntheticEmail(mobile),
    password
  );
  const uid = cred.user.uid;
  await signOut(auth);
  return uid;
}

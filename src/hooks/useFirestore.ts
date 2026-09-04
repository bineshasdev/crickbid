import { useEffect, useState } from "react";
import {
  onSnapshot,
  type DocumentReference,
  type FirestoreError,
  type Query,
} from "firebase/firestore";

/**
 * A listener whose permissions change out from under it (you log out, a
 * club gets rejected, etc.) errors instead of delivering a snapshot. Log it
 * quietly and clear the data rather than leaving it an uncaught exception.
 */
function onPermissionLoss(context: string) {
  return (err: FirestoreError) => {
    if (err.code !== "permission-denied") {
      console.error(`[${context}]`, err);
    }
  };
}

export function useFirestoreDoc<T>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
        setLoading(false);
      },
      (err) => {
        onPermissionLoss(`useFirestoreDoc ${ref.path}`)(err);
        setData(null);
        setLoading(false);
      }
    );
    return unsub;
  }, [ref?.path]);

  return { data, loading };
}

/**
 * `query` must be a referentially-stable Query (wrap the `query(...)` call
 * site in `useMemo`) — a new object every render would resubscribe forever,
 * since onSnapshot re-fires immediately on every (re)subscribe.
 */
export function useFirestoreCollection<T>(query: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      (err) => {
        onPermissionLoss("useFirestoreCollection")(err);
        setData([]);
        setLoading(false);
      }
    );
    return unsub;
  }, [query]);

  return { data, loading };
}

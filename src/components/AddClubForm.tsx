import { useMemo, useState, type FormEvent } from "react";
import { query } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { createManagerLogin } from "../lib/adminAuth";
import {
  addClubByCoordinator,
  clubPoolCollection,
  createUserProfile,
  managerUsersQuery,
  upsertClubPoolEntry,
} from "../lib/firestoreApi";
import { clubLogoPath, uploadImage } from "../lib/storageApi";
import type { AppUser, ClubPoolEntry } from "../types";

export function AddClubForm({
  tournamentId,
  defaultBudget,
}: {
  tournamentId: string;
  defaultBudget: number;
}) {
  const { profile } = useAuth();
  const coordinatorUid = profile?.uid ?? "";

  const [open, setOpen] = useState(false);

  const poolQuery = useMemo(
    () => (open && coordinatorUid ? query(clubPoolCollection(coordinatorUid)) : null),
    [open, coordinatorUid]
  );
  const { data: pool } = useFirestoreCollection<ClubPoolEntry>(poolQuery);
  const managersQuery = useMemo(() => managerUsersQuery(), []);
  const { data: existingManagers } = useFirestoreCollection<AppUser>(
    open ? managersQuery : null
  );

  const [clubMode, setClubMode] = useState<"new" | "pool">("new");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [clubName, setClubName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [managerMode, setManagerMode] = useState<"new" | "existing">("new");
  const [selectedManagerUid, setSelectedManagerUid] = useState("");
  const [managerName, setManagerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [budget, setBudget] = useState(defaultBudget);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPoolEntry = pool.find((p) => p.id === selectedPoolId) ?? null;

  function onPickPoolClub(poolId: string) {
    setSelectedPoolId(poolId);
    const entry = pool.find((p) => p.id === poolId);
    if (entry) {
      setManagerMode("existing");
      setSelectedManagerUid(entry.managerUid);
    }
  }

  function resetForm() {
    setClubMode("new");
    setSelectedPoolId("");
    setClubName("");
    setLogoFile(null);
    setManagerMode("new");
    setSelectedManagerUid("");
    setManagerName("");
    setMobile("");
    setPassword("");
    setBudget(defaultBudget);
    setOpen(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const name = clubMode === "pool" ? selectedPoolEntry!.name : clubName;

      let logoUrl: string | undefined = selectedPoolEntry?.logoUrl;
      if (logoFile) {
        logoUrl = await uploadImage(
          clubLogoPath(tournamentId, logoFile.name),
          logoFile
        );
      }

      let uid: string;
      let finalManagerName: string;
      let finalMobile: string;
      if (managerMode === "existing") {
        const manager = existingManagers.find((m) => m.uid === selectedManagerUid);
        if (!manager) throw new Error("Pick a manager");
        uid = manager.uid;
        finalManagerName = manager.name;
        finalMobile = manager.mobile;
      } else {
        uid = await createManagerLogin(mobile, password);
        await createUserProfile(uid, mobile, managerName, "manager");
        finalManagerName = managerName;
        finalMobile = mobile;
      }

      await addClubByCoordinator(
        tournamentId,
        uid,
        finalManagerName,
        finalMobile,
        name,
        budget,
        logoUrl
      );

      if (coordinatorUid) {
        await upsertClubPoolEntry(
          coordinatorUid,
          {
            name,
            logoUrl,
            managerUid: uid,
            managerName: finalManagerName,
            managerMobile: finalMobile,
          },
          clubMode === "pool" ? selectedPoolId : undefined
        );
      }

      resetForm();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "auth/email-already-in-use"
          ? "That mobile number already has a login. They may have already registered — check the list below."
          : "Could not add the club. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        + Add a club directly
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Add a club directly
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Approves the club immediately — no invite link needed.
      </p>

      <div className="flex gap-2 text-sm font-medium">
        <button
          type="button"
          onClick={() => setClubMode("new")}
          className={`rounded-lg px-3 py-1.5 ${clubMode === "new" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          New club
        </button>
        <button
          type="button"
          disabled={pool.length === 0}
          onClick={() => setClubMode("pool")}
          className={`rounded-lg px-3 py-1.5 disabled:opacity-40 ${clubMode === "pool" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          From your club pool ({pool.length})
        </button>
      </div>

      {clubMode === "pool" ? (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Club
          <select
            required
            value={selectedPoolId}
            onChange={(e) => onPickPoolClub(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="" disabled>
              Select a club…
            </option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · usually managed by {p.managerName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Club / team name
          <input
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      )}

      <div className="flex gap-2 text-sm font-medium">
        <button
          type="button"
          onClick={() => setManagerMode("new")}
          className={`rounded-lg px-3 py-1.5 ${managerMode === "new" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          New manager
        </button>
        <button
          type="button"
          disabled={existingManagers.length === 0}
          onClick={() => setManagerMode("existing")}
          className={`rounded-lg px-3 py-1.5 disabled:opacity-40 ${managerMode === "existing" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Existing user
        </button>
      </div>

      {managerMode === "existing" ? (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Manager
          <select
            required
            value={selectedManagerUid}
            onChange={(e) => setSelectedManagerUid(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="" disabled>
              Select a manager…
            </option>
            {existingManagers.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.name} · {m.mobile}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Manager name
            <input
              required
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Manager mobile
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              placeholder="9876543210"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Login password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Auction budget (points)
          <input
            type="number"
            min={0}
            required
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Club logo {clubMode === "pool" ? "(replace, optional)" : "(optional)"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add club"}
      </button>
    </form>
  );
}

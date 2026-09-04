import { useMemo, useState } from "react";
import { query } from "firebase/firestore";
import {
  clubsCollection,
  managerUsersQuery,
  setClubStatus,
  updateClubManager,
} from "../lib/firestoreApi";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { AddClubForm } from "./AddClubForm";
import type { AppUser, Club } from "../types";

export function ClubApprovals({
  tournamentId,
  defaultBudget,
}: {
  tournamentId: string;
  defaultBudget: number;
}) {
  const clubsQuery = useMemo(
    () => query(clubsCollection(tournamentId)),
    [tournamentId]
  );
  const { data: clubs, loading } = useFirestoreCollection<Club>(clubsQuery);

  return (
    <div className="flex flex-col gap-4">
      <AddClubForm tournamentId={tournamentId} defaultBudget={defaultBudget} />

      {loading && <p className="text-slate-400">Loading…</p>}
      {!loading && clubs.length === 0 && (
        <p className="text-slate-500">
          No clubs yet. Add one directly above, or share the registration
          link so clubs can register themselves.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {clubs.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-semibold text-slate-900">{c.name}</p>
            <p className="text-xs text-slate-400">
              Manager: {c.managerName} · {c.managerMobile} · Budget:{" "}
              {c.budget} pts
            </p>
            <EditManagerControl tournamentId={tournamentId} club={c} />
          </div>
          {c.status === "pending" ? (
            <div className="flex gap-2">
              <button
                onClick={() => setClubStatus(tournamentId, c.id, "approved")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                onClick={() => setClubStatus(tournamentId, c.id, "rejected")}
                className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Reject
              </button>
            </div>
          ) : (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {c.status}
            </span>
          )}
        </div>
        ))}
      </div>
    </div>
  );
}

function EditManagerControl({
  tournamentId,
  club,
}: {
  tournamentId: string;
  club: Club;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "reassign">("edit");
  const [name, setName] = useState(club.managerName);
  const [mobile, setMobile] = useState(club.managerMobile);
  const [selectedUid, setSelectedUid] = useState("");
  const [busy, setBusy] = useState(false);

  const managersQuery = useMemo(() => managerUsersQuery(), []);
  const { data: existingManagers } = useFirestoreCollection<AppUser>(
    open ? managersQuery : null
  );

  async function onSave() {
    setBusy(true);
    try {
      if (mode === "reassign") {
        const manager = existingManagers.find((m) => m.uid === selectedUid);
        if (!manager) return;
        await updateClubManager(
          tournamentId,
          club.id,
          manager.uid,
          manager.name,
          manager.mobile
        );
      } else {
        await updateClubManager(tournamentId, club.id, club.managerUid, name, mobile);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-medium text-slate-500 underline"
      >
        Edit manager
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`rounded-md px-2 py-1 ${mode === "edit" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
        >
          Update name/number
        </button>
        <button
          type="button"
          onClick={() => setMode("reassign")}
          className={`rounded-md px-2 py-1 ${mode === "reassign" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
        >
          Reassign to existing user
        </button>
      </div>

      {mode === "edit" ? (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Manager name"
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Manager mobile"
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      ) : (
        <select
          value={selectedUid}
          onChange={(e) => setSelectedUid(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
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
      )}

      <div className="flex gap-2 text-xs">
        <button
          onClick={onSave}
          disabled={busy || (mode === "reassign" && !selectedUid)}
          className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import { query } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  addPlayer,
  deletePlayer,
  playerPoolCollection,
  playersCollection,
  upsertPlayerPoolEntry,
} from "../lib/firestoreApi";
import { playerImagePath, uploadImage } from "../lib/storageApi";
import { useFirestoreCollection } from "../hooks/useFirestore";
import {
  ROLE_LABELS,
  type Player,
  type PlayerPoolEntry,
  type PlayerRole,
} from "../types";
import { ImportPlayersFromExcel } from "./ImportPlayersFromExcel";

const STATUS_LABEL: Record<Player["status"], string> = {
  available: "In pool",
  in_auction: "On the block",
  sold: "Sold",
  unsold: "Unsold",
};

export function PlayerManager({
  tournamentId,
  defaultBasePrice,
}: {
  tournamentId: string;
  defaultBasePrice: number;
}) {
  const { profile } = useAuth();
  const coordinatorUid = profile?.uid ?? "";

  const playersQuery = useMemo(
    () => query(playersCollection(tournamentId)),
    [tournamentId]
  );
  const { data: players, loading } = useFirestoreCollection<Player>(playersQuery);

  const existingMobiles = useMemo(
    () => new Set(players.map((p) => p.mobile).filter(Boolean)),
    [players]
  );

  return (
    <div className="flex flex-col gap-6">
      <ImportPlayersFromExcel defaultBasePrice={defaultBasePrice} />
      <AddPlayerForm
        tournamentId={tournamentId}
        defaultBasePrice={defaultBasePrice}
        coordinatorUid={coordinatorUid}
      />
      <PlayerPoolPicker
        tournamentId={tournamentId}
        coordinatorUid={coordinatorUid}
        existingMobiles={existingMobiles}
      />
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Players ({players.length})
        </h3>
        {loading && <p className="text-slate-400">Loading…</p>}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-400">
                  {ROLE_LABELS[p.role]} · base {p.basePrice} pts
                  {p.homeClub ? ` · ${p.homeClub}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {STATUS_LABEL[p.status]}
                </span>
                {p.status === "available" && (
                  <button
                    onClick={() => deletePlayer(tournamentId, p.id)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AddPlayerForm({
  tournamentId,
  defaultBasePrice,
  coordinatorUid,
}: {
  tournamentId: string;
  defaultBasePrice: number;
  coordinatorUid: string;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<PlayerRole>("batsman");
  const [homeClub, setHomeClub] = useState("");
  const [basePrice, setBasePrice] = useState(defaultBasePrice);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(
          playerImagePath(tournamentId, imageFile.name),
          imageFile
        );
      }
      await addPlayer(
        tournamentId,
        name,
        mobile,
        role,
        basePrice,
        homeClub || undefined,
        imageUrl
      );
      if (coordinatorUid) {
        await upsertPlayerPoolEntry(coordinatorUid, {
          name,
          mobile,
          role,
          homeClub: homeClub || undefined,
          basePrice,
          profileImageUrl: imageUrl,
        });
      }
      setName("");
      setMobile("");
      setHomeClub("");
      setImageFile(null);
      setBasePrice(defaultBasePrice);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-slate-900">Add a player</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mobile number
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PlayerRole)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Home club (optional)
          <input
            value={homeClub}
            onChange={(e) => setHomeClub(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Base price
          <input
            type="number"
            min={0}
            required
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Profile photo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add player"}
      </button>
    </form>
  );
}

function PlayerPoolPicker({
  tournamentId,
  coordinatorUid,
  existingMobiles,
}: {
  tournamentId: string;
  coordinatorUid: string;
  existingMobiles: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const poolQuery = useMemo(
    () => (open && coordinatorUid ? query(playerPoolCollection(coordinatorUid)) : null),
    [open, coordinatorUid]
  );
  const { data: pool } = useFirestoreCollection<PlayerPoolEntry>(poolQuery);

  const available = pool.filter(
    (p) => !p.mobile || !existingMobiles.has(p.mobile)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onAddSelected() {
    setBusy(true);
    try {
      const toAdd = available.filter((p) => selected.has(p.id));
      await Promise.all(
        toAdd.map((p) =>
          addPlayer(tournamentId, p.name, p.mobile, p.role, p.basePrice, p.homeClub, p.profileImageUrl)
        )
      );
      setSelected(new Set());
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
        + Add from your player pool
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Add from your player pool
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Close
        </button>
      </div>
      {available.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nothing left to add — every pool player is already in this tournament, or your pool
          is empty. Add players above, or import from Excel, to build up your pool.
        </p>
      ) : (
        <>
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {available.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[p.role]} · base {p.basePrice} pts
                    {p.homeClub ? ` · ${p.homeClub}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={onAddSelected}
            disabled={busy || selected.size === 0}
            className="self-start rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : `Add selected (${selected.size})`}
          </button>
        </>
      )}
    </div>
  );
}

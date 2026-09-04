import { useState, type FormEvent } from "react";
import { createTournament } from "../lib/firestoreApi";

export function CreateTournamentForm({ uid }: { uid: string }) {
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(1000);
  const [budget, setBudget] = useState(100000);
  const [teamSize, setTeamSize] = useState(10);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createTournament(uid, name, basePrice, budget, teamSize);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-lg">
          🏆
        </span>
        <h2 className="text-lg font-semibold text-slate-900">
          Create a new tournament
        </h2>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Tournament name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Default player base price
          <input
            type="number"
            min={0}
            required
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Default club budget
          <input
            type="number"
            min={0}
            required
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Players per team
          <input
            type="number"
            min={1}
            required
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create tournament"}
      </button>
    </form>
  );
}

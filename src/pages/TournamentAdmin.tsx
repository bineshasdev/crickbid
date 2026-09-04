import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setRegistrationOpen, tournamentRef } from "../lib/firestoreApi";
import { useFirestoreDoc } from "../hooks/useFirestore";
import { ClubApprovals } from "../components/ClubApprovals";
import { PlayerManager } from "../components/PlayerManager";
import { AuctionControlPanel } from "../components/AuctionControlPanel";
import type { Tournament } from "../types";

type Tab = "clubs" | "players" | "auction";

export function TournamentAdmin() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { profile } = useAuth();
  const { data: tournament } = useFirestoreDoc<Tournament>(
    tournamentId ? tournamentRef(tournamentId) : null
  );
  const [tab, setTab] = useState<Tab>("clubs");

  if (!tournamentId) return null;
  if (!tournament) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }
  if (profile && tournament.createdBy !== profile.uid) {
    return (
      <div className="p-8 text-center text-slate-500">
        You're not the coordinator of this tournament.
      </div>
    );
  }

  const registrationUrl = `${window.location.origin}/t/${tournamentId}/register`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
        <Link
          to={`/t/${tournamentId}/live`}
          className="text-sm font-medium text-slate-600 underline"
        >
          Open live view
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <span className="text-slate-500">Club registration link:</span>
        <code className="rounded bg-slate-100 px-2 py-1 text-xs">
          {registrationUrl}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(registrationUrl)}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
        >
          Copy
        </button>
        <label className="ml-auto flex items-center gap-2 text-slate-500">
          <input
            type="checkbox"
            checked={tournament.registrationOpen}
            onChange={(e) => setRegistrationOpen(tournamentId, e.target.checked)}
          />
          Registration open
        </label>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {(["clubs", "players", "auction"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "clubs" && (
        <ClubApprovals
          tournamentId={tournamentId}
          defaultBudget={tournament.defaultBudget}
        />
      )}
      {tab === "players" && (
        <PlayerManager
          tournamentId={tournamentId}
          defaultBasePrice={tournament.defaultBasePrice}
        />
      )}
      {tab === "auction" && (
        <AuctionControlPanel tournamentId={tournamentId} tournament={tournament} />
      )}
    </div>
  );
}

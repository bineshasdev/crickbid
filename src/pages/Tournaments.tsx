import { useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { CreateTournamentForm } from "../components/CreateTournamentForm";
import type { AuctionStatus, Tournament } from "../types";

const STATUS_STYLE: Record<AuctionStatus, string> = {
  not_started: "bg-amber-100 text-amber-700",
  live: "bg-rose-100 text-rose-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
};

export function Tournaments() {
  const { profile } = useAuth();

  const tournamentsQuery = useMemo(
    () =>
      profile
        ? query(collection(db, "tournaments"), where("createdBy", "==", profile.uid))
        : null,
    [profile]
  );
  const { data: tournaments, loading } = useFirestoreCollection<Tournament>(tournamentsQuery);

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Your tournaments</h1>
      <div className="flex flex-col gap-8">
        <CreateTournamentForm uid={profile.uid} />

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            All tournaments ({tournaments.length})
          </h2>
          {loading && <p className="text-slate-400">Loading…</p>}
          {!loading && tournaments.length === 0 && (
            <p className="text-slate-400">
              No tournaments yet — create your first one above.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.auctionStatus]}`}
                  >
                    {t.auctionStatus.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Base price {t.defaultBasePrice} pts · budget {t.defaultBudget} pts ·{" "}
                  {t.teamSize ?? 10} players/team
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    to={`/t/${t.id}/admin`}
                    className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
                  >
                    Manage
                  </Link>
                  <Link
                    to={`/t/${t.id}/live`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Live view
                  </Link>
                  <Link
                    to={`/t/${t.id}/register`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Registration link
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

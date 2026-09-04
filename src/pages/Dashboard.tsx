import { useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, collectionGroup, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useFirestoreCollection, useFirestoreDoc } from "../hooks/useFirestore";
import { auctionStateRef } from "../lib/firestoreApi";
import { CreateTournamentForm } from "../components/CreateTournamentForm";
import type { AuctionState, Club, Player, Tournament } from "../types";

export function Dashboard() {
  const { profile, logout } = useAuth();

  if (!profile) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <p className="font-semibold text-slate-900">
          We couldn't load your profile.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your login exists, but its account details are missing. Log out
          and try creating an account again.
        </p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Welcome, {profile.name}
      </h1>
      {profile.role === "coordinator" ? (
        <CoordinatorDashboard uid={profile.uid} />
      ) : (
        <ManagerDashboard uid={profile.uid} />
      )}
    </div>
  );
}

function CoordinatorDashboard({ uid }: { uid: string }) {
  const tournamentsQuery = useMemo(
    () => query(collection(db, "tournaments"), where("createdBy", "==", uid)),
    [uid]
  );
  const { data: tournaments, loading } =
    useFirestoreCollection<Tournament>(tournamentsQuery);

  if (loading) return <p className="text-slate-400">Loading…</p>;

  // First-time coordinator: skip straight to onboarding, no empty sections.
  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-slate-500">
          No tournaments yet — create your first one to get started.
        </p>
        <CreateTournamentForm uid={uid} />
      </div>
    );
  }

  const live = tournaments.filter((t) => t.auctionStatus === "live");
  const upcoming = tournaments.filter((t) => t.auctionStatus === "not_started");
  const past = tournaments.filter((t) => t.auctionStatus === "completed");

  return (
    <div className="flex flex-col gap-8">
      {live.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            Live now
          </h2>
          <div className="flex flex-col gap-3">
            {live.map((t) => (
              <LiveAuctionCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Upcoming tournaments
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcoming.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Budget {t.defaultBudget} pts · {t.teamSize ?? 10} players/team
                </p>
                <Link
                  to={`/t/${t.id}/admin`}
                  className="mt-3 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Set up →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Past tournaments
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {past.map((t) => (
              <Link
                key={t.id}
                to={`/t/${t.id}/admin`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Completed
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Budget {t.defaultBudget} pts · {t.teamSize ?? 10} players/team
                </p>
                <span className="mt-3 inline-block text-xs font-medium text-indigo-600">
                  View results & rosters →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link
        to="/tournaments"
        className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Manage all tournaments →
      </Link>
    </div>
  );
}

function LiveAuctionCard({ tournament }: { tournament: Tournament }) {
  const { data: state } = useFirestoreDoc<AuctionState>(auctionStateRef(tournament.id));

  const currentPlayerRef = useMemo(
    () =>
      state?.currentPlayerId
        ? doc(db, "tournaments", tournament.id, "players", state.currentPlayerId)
        : null,
    [tournament.id, state?.currentPlayerId]
  );
  const { data: player } = useFirestoreDoc<Player>(currentPlayerRef);

  return (
    <Link
      to={`/t/${tournament.id}/live`}
      className="block rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 p-5 text-white shadow-md transition hover:shadow-lg"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-100">
        {tournament.name}
      </p>
      {player ? (
        <>
          <h3 className="mt-1 text-xl font-bold">{player.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{state?.currentBid ?? 0} pts</span>
            <span className="text-sm text-indigo-100">
              {state?.currentBidClubName ?? "No bids yet"}
            </span>
          </div>
        </>
      ) : (
        <h3 className="mt-1 text-lg font-semibold text-indigo-100">
          Drawing next player…
        </h3>
      )}
      <span className="mt-3 inline-block text-sm font-medium text-white/90">
        Watch live →
      </span>
    </Link>
  );
}

function ManagerDashboard({ uid }: { uid: string }) {
  const clubsQuery = useMemo(
    () => query(collectionGroup(db, "clubs"), where("managerUid", "==", uid)),
    [uid]
  );
  const { data: clubs, loading } = useFirestoreCollection<Club>(clubsQuery);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (clubs.length === 0) {
    return (
      <p className="text-slate-500">
        You haven't registered a club yet. Use the registration link your
        tournament coordinator shared with you.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {clubs.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-semibold text-slate-900">{c.name}</p>
            <p className="text-xs text-slate-400">
              {c.remainingPoints} / {c.budget} pts remaining
            </p>
          </div>
          {c.status === "approved" ? (
            <Link
              to={`/t/${c.tournamentId}/live`}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Go to auction
            </Link>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {c.status === "pending" ? "Awaiting approval" : "Rejected"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

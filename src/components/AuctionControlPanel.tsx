import { useMemo } from "react";
import { doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useFirestoreCollection, useFirestoreDoc } from "../hooks/useFirestore";
import {
  auctionStateRef,
  clubsCollection,
  drawNextPlayer,
  markSold,
  markUnsold,
  playersCollection,
  relistPlayer,
  startAuction,
} from "../lib/firestoreApi";
import { PlayerCard } from "./PlayerCard";
import type { AuctionState, Club, Player, Tournament } from "../types";

export function AuctionControlPanel({
  tournamentId,
  tournament,
}: {
  tournamentId: string;
  tournament: Tournament;
}) {
  const { data: state } = useFirestoreDoc<AuctionState>(
    auctionStateRef(tournamentId)
  );

  const currentPlayerDocRef = useMemo(
    () =>
      state?.currentPlayerId
        ? doc(db, "tournaments", tournamentId, "players", state.currentPlayerId)
        : null,
    [tournamentId, state?.currentPlayerId]
  );
  const { data: currentPlayer } = useFirestoreDoc<Player>(currentPlayerDocRef);

  const availableQuery = useMemo(
    () => query(playersCollection(tournamentId), where("status", "==", "available")),
    [tournamentId]
  );
  const { data: available } = useFirestoreCollection<Player>(availableQuery);

  const unsoldQuery = useMemo(
    () => query(playersCollection(tournamentId), where("status", "==", "unsold")),
    [tournamentId]
  );
  const { data: unsold } = useFirestoreCollection<Player>(unsoldQuery);

  if (!state) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      {tournament.auctionStatus === "not_started" && (
        <button
          disabled={available.length === 0}
          onClick={() => startAuction(tournamentId)}
          className="self-start rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {available.length === 0
            ? "Add players before starting"
            : `Start auction (${available.length} players)`}
        </button>
      )}

      {tournament.auctionStatus === "live" && (
        <div className="flex flex-col items-center gap-4">
          {currentPlayer ? (
            <>
              <PlayerCard player={currentPlayer} />
              <div className="text-center">
                <p className="text-sm text-slate-400">Current bid</p>
                <p className="text-3xl font-extrabold text-slate-900">
                  {state.currentBid} pts
                </p>
                <p className="text-sm text-emerald-600">
                  {state.currentBidClubName ?? "No bids yet"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  disabled={!state.currentBidClubId}
                  onClick={() =>
                    markSold(
                      tournamentId,
                      currentPlayer.id,
                      state.currentBidClubId!,
                      state.currentBid
                    )
                  }
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Sold
                </button>
                <button
                  onClick={() => markUnsold(tournamentId, currentPlayer.id)}
                  className="rounded-lg bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Unsold
                </button>
                <button
                  disabled={!!state.currentBidClubId}
                  onClick={() => drawNextPlayer(tournamentId)}
                  title={
                    state.currentBidClubId
                      ? "Can't skip/redraw once a bid has been placed"
                      : undefined
                  }
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Skip / redraw
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-400">Drawing next player…</p>
          )}
        </div>
      )}

      {tournament.auctionStatus === "completed" && (
        <p className="text-slate-500">
          Auction complete — every player has been drawn.
        </p>
      )}

      <ClubBudgetSummary tournamentId={tournamentId} teamSize={tournament.teamSize ?? 10} />

      {unsold.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Unsold players ({unsold.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {unsold.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {p.name}
                <button
                  onClick={() => relistPlayer(tournamentId, p.id)}
                  className="text-xs font-medium text-slate-600 underline"
                >
                  Put back up for auction
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClubBudgetSummary({
  tournamentId,
  teamSize,
}: {
  tournamentId: string;
  teamSize: number;
}) {
  const clubsQuery = useMemo(
    () => query(clubsCollection(tournamentId), where("status", "==", "approved")),
    [tournamentId]
  );
  const { data: clubs } = useFirestoreCollection<Club>(clubsQuery);

  const soldQuery = useMemo(
    () => query(playersCollection(tournamentId), where("status", "==", "sold")),
    [tournamentId]
  );
  const { data: sold } = useFirestoreCollection<Player>(soldQuery);

  if (clubs.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        Club budgets
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {clubs.map((c) => {
          const roster = sold.filter((p) => p.soldToClubId === c.id).length;
          const isFull = roster >= teamSize;
          return (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <p className="font-medium text-slate-900">{c.name}</p>
              <p className="text-xs text-slate-400">
                {c.remainingPoints} / {c.budget} pts
              </p>
              <p
                className={`text-xs ${isFull ? "font-medium text-emerald-600" : "text-slate-400"}`}
              >
                {roster} / {teamSize} players{isFull ? " — full" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

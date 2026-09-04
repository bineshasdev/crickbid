import { useMemo, useState } from "react";
import { doc, limit, orderBy, query, where } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useFirestoreCollection, useFirestoreDoc } from "../hooks/useFirestore";
import {
  auctionStateRef,
  bidsCollection,
  clubsCollection,
  placeBid,
  playersCollection,
  tournamentRef,
} from "../lib/firestoreApi";
import { QUICK_BID_JUMPS, effectiveRemainingPoints, nextBidAmount } from "../lib/auctionRules";
import { PlayerCard } from "../components/PlayerCard";
import { ClubBoard } from "../components/ClubBoard";
import type { AuctionState, Bid, Club, Player, Tournament } from "../types";

export function TournamentLive() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { profile } = useAuth();

  const { data: tournament } = useFirestoreDoc<Tournament>(
    tournamentId ? tournamentRef(tournamentId) : null
  );
  const { data: state } = useFirestoreDoc<AuctionState>(
    tournamentId ? auctionStateRef(tournamentId) : null
  );

  const currentPlayerDocRef = useMemo(
    () =>
      tournamentId && state?.currentPlayerId
        ? doc(db, "tournaments", tournamentId, "players", state.currentPlayerId)
        : null,
    [tournamentId, state?.currentPlayerId]
  );
  const { data: currentPlayer } = useFirestoreDoc<Player>(currentPlayerDocRef);

  const clubsQuery = useMemo(
    () =>
      tournamentId
        ? query(clubsCollection(tournamentId), where("status", "==", "approved"))
        : null,
    [tournamentId]
  );
  const { data: clubs } = useFirestoreCollection<Club>(clubsQuery);

  const playersQuery = useMemo(
    () => (tournamentId ? query(playersCollection(tournamentId)) : null),
    [tournamentId]
  );
  const { data: players } = useFirestoreCollection<Player>(playersQuery);

  const bidsQuery = useMemo(
    () =>
      tournamentId && state?.currentPlayerId
        ? query(
            bidsCollection(tournamentId),
            where("playerId", "==", state.currentPlayerId),
            orderBy("createdAt", "desc"),
            limit(8)
          )
        : null,
    [tournamentId, state?.currentPlayerId]
  );
  const { data: recentBids } = useFirestoreCollection<Bid>(bidsQuery);

  const myClub = useMemo(
    () => clubs.find((c) => c.managerUid === profile?.uid) ?? null,
    [clubs, profile?.uid]
  );

  const [bidError, setBidError] = useState("");
  const [bidding, setBidding] = useState(false);

  if (!tournamentId || !tournament || !state) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  const nextAmount = nextBidAmount(state.currentBid);
  const myEffectivePoints = myClub ? effectiveRemainingPoints(myClub, state) : 0;
  const canBidBase =
    !!myClub &&
    state.status === "live" &&
    !!currentPlayer &&
    state.currentBidClubId !== myClub.id;
  const canBid = canBidBase && myEffectivePoints >= nextAmount;

  async function onBid(amount: number) {
    if (!myClub || !currentPlayer || !tournamentId) return;
    setBidError("");
    setBidding(true);
    try {
      await placeBid(tournamentId, amount, myClub.id, myClub.name, currentPlayer.id);
    } catch {
      setBidError("Bid failed — someone may have just outbid you.");
    } finally {
      setBidding(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900">{tournament.name}</h1>

        {tournament.auctionStatus === "not_started" && (
          <p className="text-slate-500">The auction hasn't started yet.</p>
        )}
        {tournament.auctionStatus === "completed" && (
          <p className="text-slate-500">The auction has finished.</p>
        )}

        {currentPlayer && (
          <>
            <PlayerCard player={currentPlayer} />
            <div className="text-center">
              <p className="text-sm text-slate-400">Current bid</p>
              <p className="text-4xl font-extrabold text-slate-900">
                {state.currentBid} pts
              </p>
              <p className="text-sm text-emerald-600">
                {state.currentBidClubName ?? "No bids yet"}
              </p>
            </div>

            {myClub ? (
              <>
                <button
                  onClick={() => onBid(nextAmount)}
                  disabled={!canBid || bidding}
                  className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
                >
                  {state.currentBidClubId === myClub.id
                    ? "You're leading"
                    : `Bid ${nextAmount} pts`}
                </button>
                {canBidBase && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_BID_JUMPS.map((jump) => {
                      const amount = state.currentBid + jump;
                      return (
                        <button
                          key={jump}
                          onClick={() => onBid(amount)}
                          disabled={bidding || myEffectivePoints < amount}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          +{jump}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">
                You're viewing as a spectator.
              </p>
            )}
            {bidError && <p className="text-sm text-red-600">{bidError}</p>}
            {myClub && (
              <p className="text-xs text-slate-400">
                Your remaining points: {myEffectivePoints}
              </p>
            )}

            {recentBids.length > 0 && (
              <div className="w-full max-w-xs">
                <p className="mb-1 text-center text-xs font-semibold text-slate-400">
                  Live bids
                </p>
                <ul className="flex flex-col gap-1">
                  {recentBids.map((bid, i) => (
                    <li
                      key={bid.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                        i === 0
                          ? "bg-emerald-50 font-semibold text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      <span>{bid.clubName}</span>
                      <span>{bid.amount} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Clubs & remaining points
        </h2>
        <ClubBoard
          clubs={clubs}
          players={players}
          highlightClubId={state.currentBidClubId}
          currentBid={state.currentBid}
          teamSize={tournament.teamSize ?? 10}
        />
      </div>
    </div>
  );
}

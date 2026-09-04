import { useState } from "react";
import type { Club, Player } from "../types";
import { ROLE_LABELS } from "../types";

export function ClubBoard({
  clubs,
  players,
  highlightClubId,
  currentBid = 0,
  teamSize = 10,
}: {
  clubs: Club[];
  players: Player[];
  highlightClubId?: string | null;
  currentBid?: number;
  teamSize?: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const approved = clubs.filter((c) => c.status === "approved");

  return (
    <div className="flex flex-col gap-2">
      {approved.map((club) => {
        const roster = players.filter((p) => p.soldToClubId === club.id);
        const spent = club.budget - club.remainingPoints;
        const isLeading = club.id === highlightClubId;
        const pointsLeft = isLeading
          ? club.remainingPoints - currentBid
          : club.remainingPoints;
        const isOpen = expanded === club.id;
        return (
          <div
            key={club.id}
            className={`rounded-xl border bg-white shadow-sm transition ${
              isLeading
                ? "border-emerald-400 ring-2 ring-emerald-300"
                : "border-slate-200"
            }`}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : club.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{club.name}</p>
                  <p className="text-xs text-slate-400">
                    {roster.length} / {teamSize} players
                    {roster.length >= teamSize && (
                      <span className="font-medium text-emerald-600"> — full</span>
                    )}
                    {" "}· spent {spent}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{pointsLeft}</p>
                <p className="text-xs text-slate-400">pts left</p>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 px-4 py-2">
                {roster.length === 0 ? (
                  <p className="py-1 text-xs text-slate-400">
                    No players yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {roster.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span>
                          {p.name}{" "}
                          <span className="text-xs text-slate-400">
                            ({ROLE_LABELS[p.role]})
                          </span>
                        </span>
                        <span className="font-medium text-slate-700">
                          {p.soldPrice} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

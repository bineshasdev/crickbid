import { ROLE_LABELS, type Player, type PlayerRole } from "../types";

const ROLE_THEME: Record<PlayerRole, { ring: string; gradient: string; icon: string }> = {
  batsman: { ring: "ring-blue-200", gradient: "from-blue-500 to-indigo-600", icon: "🏏" },
  bowler: { ring: "ring-emerald-200", gradient: "from-emerald-500 to-teal-600", icon: "🎯" },
  allrounder: { ring: "ring-amber-200", gradient: "from-amber-500 to-orange-600", icon: "⭐" },
  keeper: { ring: "ring-purple-200", gradient: "from-purple-500 to-fuchsia-600", icon: "🧤" },
};

export function PlayerCard({ player }: { player: Player }) {
  const theme = ROLE_THEME[player.role];

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100">
      <div className={`bg-gradient-to-br ${theme.gradient} px-6 pb-14 pt-6 text-center`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/85">
          {theme.icon} {ROLE_LABELS[player.role]}
        </p>
      </div>
      <div className="-mt-12 flex flex-col items-center gap-2 px-6 pb-6">
        <div
          className={`h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-4 ${theme.ring}`}
        >
          {player.profileImageUrl ? (
            <img
              src={player.profileImageUrl}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-center text-2xl font-bold text-slate-900">{player.name}</h2>
        {player.homeClub && (
          <p className="text-sm text-slate-500">{player.homeClub}</p>
        )}
        <div className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white">
          Base price · {player.basePrice} pts
        </div>
      </div>
    </div>
  );
}

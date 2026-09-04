import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900">
        Run your club's player auction, live, from any phone.
      </h1>
      <p className="text-slate-500">
        Register clubs, set a points budget, add players, and run the auction
        with everyone watching bids update in real time — no app install
        needed.
      </p>
      <div className="flex gap-3">
        <Link
          to="/signup"
          className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
        >
          Start a tournament
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log in
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {[
          {
            title: "1. Set up",
            body: "Create a tournament, share the registration link with clubs, and add players with photos and roles.",
          },
          {
            title: "2. Bid live",
            body: "Coordinator draws players at random. Club managers bid from their own phone; everyone sees it update instantly.",
          },
          {
            title: "3. Track budgets",
            body: "Remaining points, rosters, and every other club's spend are visible to all clubs throughout the auction.",
          },
        ].map((s) => (
          <div key={s.title} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">{s.title}</p>
            <p className="mt-1 text-sm text-slate-500">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <Link
        to="/"
        className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-lg font-extrabold text-transparent"
      >
        🏏 CrickBid
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {profile ? (
          <>
            <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            {profile.role === "coordinator" && (
              <Link
                to="/tournaments"
                className="rounded-md bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100"
              >
                + Create tournament
              </Link>
            )}
            <span className="hidden text-slate-400 sm:inline">
              {profile.name}
            </span>
            <button
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="rounded-md bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
            >
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

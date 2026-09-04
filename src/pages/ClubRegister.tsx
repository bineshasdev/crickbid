import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { getTournament, myClubInTournament, registerClub } from "../lib/firestoreApi";
import { clubLogoPath, uploadImage } from "../lib/storageApi";
import type { Tournament } from "../types";

export function ClubRegister() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { profile, register: registerAccount } = useAuth();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [managerName, setManagerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const t = await getTournament(tournamentId);
      setTournament(t);
      setBudget(t?.defaultBudget ?? 0);
      if (profile?.role === "manager") {
        const existing = await myClubInTournament(tournamentId, profile.uid);
        setAlreadyRegistered(!!existing);
      }
      setLoadingTournament(false);
    })();
  }, [tournamentId, profile?.uid, profile?.role]);

  if (!tournamentId) return null;
  if (loadingTournament) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }
  if (!tournament) {
    return (
      <div className="p-8 text-center text-slate-500">
        Tournament not found.
      </div>
    );
  }
  if (!tournament.registrationOpen) {
    return (
      <div className="p-8 text-center text-slate-500">
        Registration for {tournament.name} is closed.
      </div>
    );
  }
  if (profile?.role === "coordinator") {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center text-slate-500">
        You're logged in as a coordinator. Log out and register with a club
        manager's mobile number to enter a club into {tournament.name}.
      </div>
    );
  }
  if (alreadyRegistered) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center text-slate-500">
        You've already registered a club for {tournament.name}.{" "}
        <button
          onClick={() => navigate("/dashboard")}
          className="font-medium text-slate-900 underline"
        >
          Go to your dashboard
        </button>
      </div>
    );
  }
  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <p className="text-lg font-semibold text-slate-900">
          Registration submitted!
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The coordinator will review and approve {clubName} shortly.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tournamentId || !tournament) return;
    setError("");
    setBusy(true);
    try {
      const name = profile?.name ?? managerName;
      const mobileNumber = profile?.mobile ?? mobile;

      if (!profile) {
        await registerAccount(mobile, password, managerName, "manager");
      }
      const uid = auth.currentUser!.uid;

      let logoUrl: string | undefined;
      if (logoFile) {
        logoUrl = await uploadImage(
          clubLogoPath(tournamentId, logoFile.name),
          logoFile
        );
      }

      await registerClub(
        tournamentId,
        uid,
        name,
        mobileNumber,
        clubName,
        budget ?? tournament.defaultBudget,
        logoUrl
      );
      setDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "auth/email-already-in-use"
          ? "That mobile number already has an account. Log in first, then open this link again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">
        Register your club
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        for {tournament.name}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {!profile && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Your name (club manager)
              <input
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Your mobile number
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="9876543210"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Club / team name
          <input
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Auction budget (points)
          <input
            type="number"
            min={0}
            required
            value={budget ?? ""}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Club logo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Register club"}
        </button>
      </form>
    </div>
  );
}

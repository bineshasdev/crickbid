import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(mobile, password, name, "coordinator");
      navigate("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "auth/email-already-in-use"
          ? "That mobile number is already registered. Try logging in instead."
          : "Could not create your account. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        Create a coordinator account
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Use this to set up and run a tournament. Club managers register
        separately, through your tournament's club-registration link.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Your name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mobile number
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

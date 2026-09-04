import { useState, type ChangeEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { upsertPlayerPoolEntry } from "../lib/firestoreApi";
import type { PlayerRole } from "../types";

interface ParsedRow {
  name: string;
  mobile: string;
  role: PlayerRole;
  homeClub?: string;
  basePrice: number;
}

function getField(row: Record<string, unknown>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (key !== undefined) return String(row[key] ?? "").trim();
  }
  return "";
}

function normalizeRole(raw: string): PlayerRole {
  const r = raw.trim().toLowerCase();
  if (r.includes("keep") || r === "wk") return "keeper";
  if (r.includes("all")) return "allrounder";
  if (r.includes("bowl")) return "bowler";
  return "batsman";
}

function parseRows(rows: Record<string, unknown>[], defaultBasePrice: number): ParsedRow[] {
  return rows
    .map((row): ParsedRow | null => {
      const name = getField(row, ["name", "player name", "player"]);
      if (!name) return null;
      const mobile = getField(row, ["mobile", "mobile number", "phone", "contact"]);
      const role = normalizeRole(getField(row, ["role", "player role", "position"]));
      const homeClub = getField(row, ["home club", "club", "team"]);
      const basePriceRaw = getField(row, ["base price", "baseprice", "price"]);
      const parsedPrice = Number(basePriceRaw);
      return {
        name,
        mobile,
        role,
        homeClub: homeClub || undefined,
        basePrice: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : defaultBasePrice,
      };
    })
    .filter((r): r is ParsedRow => r !== null);
}

/**
 * Bulk-imports players (no photos — those still need to be added one at a
 * time) from an Excel/CSV sheet straight into the coordinator's reusable
 * player pool. Restricted to the "admin" role; everyone else adds
 * players one at a time or pulls existing pool entries into a tournament.
 */
export function ImportPlayersFromExcel({ defaultBasePrice }: { defaultBasePrice: number }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const coordinatorUid = profile?.uid ?? "";

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(0);

  if (!isAdmin) return null;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setDone(0);
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = parseRows(raw, defaultBasePrice);
      if (parsed.length === 0) {
        setError("No player rows found — make sure the sheet has a Name column.");
      }
      setRows(parsed);
    } catch {
      setError("Could not read that file. Use a .xlsx, .xls, or .csv export.");
      setRows([]);
    }
  }

  async function onImport() {
    setBusy(true);
    setProgress(0);
    try {
      for (const row of rows) {
        await upsertPlayerPoolEntry(coordinatorUid, row);
        setProgress((p) => p + 1);
      }
      setDone(rows.length);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        Import players from Excel
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          admin only
        </span>
      </h3>
      <p className="text-xs text-slate-500">
        Columns (any order/case): Name, Mobile, Role, Home Club, Base Price — no photos, add
        those individually afterwards. Rows land in your player pool below, ready to pull into
        any tournament.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={onFile}
        className="text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span>
            {fileName}: {rows.length} player{rows.length === 1 ? "" : "s"} found
          </span>
          <button
            onClick={onImport}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? `Importing ${progress}/${rows.length}…` : "Import to pool"}
          </button>
        </div>
      )}
      {done > 0 && (
        <p className="text-sm text-emerald-600">
          Imported {done} player{done === 1 ? "" : "s"} to your pool — pull them into this
          tournament from "Add from your player pool" below.
        </p>
      )}
    </div>
  );
}

import type { Holding } from "./types";

/** CRADY Portfolio Analyzer Phase 1 — localStorage only, no server storage
 * of personal holdings (§3 of the spec). `schemaVersion` exists purely so a
 * future account-sync feature (Email OTP users) can detect and migrate an
 * older local shape without guessing — Phase 1 itself does no syncing. */

const STORAGE_KEY = "crady:portfolio:v1";
const SCHEMA_VERSION = 1;

type StoredPortfolio = {
  schemaVersion: number;
  holdings: Holding[];
  updatedAt: string;
};

function isHolding(v: unknown): v is Holding {
  if (!v || typeof v !== "object") return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.ticker === "string" &&
    typeof h.purchaseDate === "string" &&
    (typeof h.shares === "number" || h.shares === null) &&
    (typeof h.investmentAmount === "number" || h.investmentAmount === null) &&
    (typeof h.avgPurchasePrice === "number" || h.avgPurchasePrice === null) &&
    typeof h.dividendReinvestment === "boolean"
  );
}

export function loadPortfolio(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPortfolio;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.holdings)) return [];
    return parsed.holdings.filter(isHolding);
  } catch {
    return [];
  }
}

export function savePortfolio(holdings: Holding[]): void {
  if (typeof window === "undefined") return;
  try {
    const data: StoredPortfolio = { schemaVersion: SCHEMA_VERSION, holdings, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded / private-browsing storage denial — the analyzer
    // still works for the current session via in-memory React state, it
    // just won't persist across reloads. Not worth surfacing as an error.
  }
}

export function clearPortfolio(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see savePortfolio */
  }
}

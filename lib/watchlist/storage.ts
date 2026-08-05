/** Design System 2.0, §6 — Watchlist. Browser (localStorage) only, no
 * login required, mirrors the established pattern from
 * lib/portfolio/storage.ts (schemaVersion for future-proofing, silent
 * catch on quota/private-browsing denial). */

const STORAGE_KEY = "crady:watchlist:v1";
const SCHEMA_VERSION = 1;
const CHANGE_EVENT = "crady:watchlist:change";

type StoredWatchlist = {
  schemaVersion: number;
  tickers: string[];
  updatedAt: string;
};

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredWatchlist;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.tickers)) return [];
    return parsed.tickers.filter((t) => typeof t === "string");
  } catch {
    return [];
  }
}

/** Stable-reference cache for useSyncExternalStore — loadWatchlist() above
 * parses fresh JSON every call, which would hand React a new array
 * identity on every render and force an infinite re-render loop. This
 * only allocates a new array when the underlying content actually
 * changed (compared by a cheap join, not deep-equal). */
let cachedTickers: string[] = [];
let cachedKey = "";
export function getWatchlistSnapshot(): string[] {
  const fresh = loadWatchlist();
  const key = fresh.join(",");
  if (key !== cachedKey) {
    cachedKey = key;
    cachedTickers = fresh;
  }
  return cachedTickers;
}

function save(tickers: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const data: StoredWatchlist = { schemaVersion: SCHEMA_VERSION, tickers, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Quota exceeded / private-browsing denial — non-fatal, matches
    // lib/portfolio/storage.ts's savePortfolio.
  }
}

export function isWatched(ticker: string): boolean {
  return loadWatchlist().includes(ticker.toUpperCase());
}

export function toggleWatched(ticker: string): boolean {
  const t = ticker.toUpperCase();
  const current = loadWatchlist();
  const next = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
  save(next);
  return next.includes(t);
}

export function onWatchlistChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

import { providerLabel } from "@/lib/providers";

/** Public fields only — no internal ids, no risk-model internals, nothing
 * beyond what's already shown on public pages. Built from the same
 * home-page snapshot every page already fetches (see app/(en)/layout.tsx /
 * app/ko/layout.tsx), not a separate query — this stays "build-time
 * generated, revalidated on the same schedule as everything else" rather
 * than a new data source to keep in sync. */
export type SearchEntry = {
  ticker: string;
  name: string | null;
  provider_id: string;
  annualYieldPct: number | null;
  cradyScore: number | null;
};

export type MatchType =
  | "ticker-exact"
  | "ticker-prefix"
  | "ticker-substring"
  | "name-prefix"
  | "name-substring"
  | "issuer";

export type SearchResult = SearchEntry & { matchType: MatchType; matchIndex: number };

const MATCH_RANK: Record<MatchType, number> = {
  "ticker-exact": 0,
  "ticker-prefix": 1,
  "ticker-substring": 2,
  "name-prefix": 3,
  "name-substring": 4,
  issuer: 5,
};

/** Case-insensitive, whitespace-trimmed — "  msty ", "MSTY", "msty" all
 * normalize identically. No fuzzy/typo-tolerant matching by design (Part C:
 * "do not make fuzzy matching so broad that irrelevant funds dominate") —
 * substring matching against a ~90-entry universe is already generous
 * enough that broader fuzzy matching would mostly surface noise. */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Exact match > ticker prefix > ticker substring > name prefix > name
 * substring > issuer match, then by match position, then alphabetically —
 * the exact order Part C specifies. Returns [] for an empty/whitespace-only
 * query rather than the full index (an empty query isn't "match
 * everything", it's "nothing typed yet"). */
export function searchTickers(
  index: SearchEntry[],
  rawQuery: string,
  limit = 8
): SearchResult[] {
  const q = normalize(rawQuery);
  if (!q) return [];

  const results: SearchResult[] = [];
  for (const entry of index) {
    const ticker = entry.ticker.toLowerCase();
    const name = (entry.name ?? "").toLowerCase();
    const issuer = providerLabel(entry.provider_id).toLowerCase();

    let matchType: MatchType | null = null;
    let matchIndex = 0;

    if (ticker === q) {
      matchType = "ticker-exact";
    } else if (ticker.startsWith(q)) {
      matchType = "ticker-prefix";
    } else if (ticker.includes(q)) {
      matchType = "ticker-substring";
      matchIndex = ticker.indexOf(q);
    } else if (name.startsWith(q)) {
      matchType = "name-prefix";
    } else if (name.includes(q)) {
      matchType = "name-substring";
      matchIndex = name.indexOf(q);
    } else if (issuer.includes(q)) {
      matchType = "issuer";
      matchIndex = issuer.indexOf(q);
    }

    if (matchType) results.push({ ...entry, matchType, matchIndex });
  }

  results.sort((a, b) => {
    const rankDiff = MATCH_RANK[a.matchType] - MATCH_RANK[b.matchType];
    if (rankDiff !== 0) return rankDiff;
    if (a.matchIndex !== b.matchIndex) return a.matchIndex - b.matchIndex;
    return a.ticker.localeCompare(b.ticker);
  });

  return results.slice(0, limit);
}

/** Splits `text` into [before, match, after] around the first
 * case-insensitive occurrence of `query`, for rendering a highlighted
 * substring. Returns the whole text as `before` (no match) if not found —
 * callers should still render `before` in that case. */
export function splitForHighlight(
  text: string,
  query: string
): { before: string; match: string; after: string } {
  const q = normalize(query);
  if (!q) return { before: text, match: "", after: "" };
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return { before: text, match: "", after: "" };
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length),
  };
}

import type { CompareEntry } from "./types";

export type OkCompareEntry = Extract<CompareEntry, { ok: true }>;

export type NeighborGroups = {
  benchmark: OkCompareEntry | null;
  /** Ranked strictly higher than the benchmark, best-first (descending —
   * matches how the reference layout reads top to bottom). */
  higher: OkCompareEntry[];
  /** Ranked strictly lower than the benchmark, best-first (i.e. the entry
   * immediately below the benchmark comes first). */
  lower: OkCompareEntry[];
  insufficientHistoryCount: number;
  /** 1-based rank among successfully-computed entries, or null if the
   * benchmark itself couldn't be computed for this period. */
  rank: number | null;
  totalRanked: number;
};

/** Pure, client-side re-slicing of an already-fetched, already-computed
 * universe — switching the benchmark dropdown never re-fetches or
 * re-runs the (expensive) 72-ticker scan. Entries are ranked purely by
 * totalReturnPct; anything that failed (split-anomaly / invalid-range /
 * insufficient-history) is excluded from ranking, and
 * insufficient-history specifically gets its own honest count rather
 * than being silently dropped. */
export function selectNeighbors(
  universe: CompareEntry[],
  benchmarkTicker: string,
  neighborCount = 5
): NeighborGroups {
  const ranked = universe
    .filter((e): e is OkCompareEntry => e.ok)
    .sort((a, b) => b.totalReturnPct - a.totalReturnPct);

  const insufficientHistoryCount = universe.filter(
    (e) => !e.ok && e.reason === "insufficient-history"
  ).length;

  const idx = ranked.findIndex((e) => e.ticker === benchmarkTicker);
  if (idx === -1) {
    return { benchmark: null, higher: [], lower: [], insufficientHistoryCount, rank: null, totalRanked: ranked.length };
  }

  const start = Math.max(0, idx - neighborCount);
  const end = Math.min(ranked.length, idx + neighborCount + 1);

  return {
    benchmark: ranked[idx],
    higher: ranked.slice(start, idx),
    lower: ranked.slice(idx + 1, end),
    insufficientHistoryCount,
    rank: idx + 1,
    totalRanked: ranked.length,
  };
}

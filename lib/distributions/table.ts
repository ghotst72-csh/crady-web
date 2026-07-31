import { providerLabel } from "@/lib/providers";

export type DistributionRow = {
  ticker: string;
  etfName: string | null;
  providerId: string;
  frequency: string | null;
  distributionPerShare: number | null;
  distributionRate: number | null;
  secYield30d: number | null;
  rocPercent: number | null;
  exDate: string;
  payDate: string;
  sourceUrl: string | null;
};

export type SortOption =
  | "ticker-asc"
  | "amount-desc"
  | "rate-desc"
  | "roc-desc"
  | "roc-asc"
  | "pay-date-desc";

export const SORT_OPTIONS: { value: SortOption; en: string; ko: string }[] = [
  { value: "ticker-asc", en: "Ticker A–Z", ko: "티커 가나다순" },
  { value: "amount-desc", en: "Highest distribution per share", ko: "주당 분배금 높은 순" },
  { value: "rate-desc", en: "Highest distribution rate", ko: "분배율 높은 순" },
  { value: "roc-desc", en: "Highest ROC", ko: "ROC 높은 순" },
  { value: "roc-asc", en: "Lowest ROC", ko: "ROC 낮은 순" },
  { value: "pay-date-desc", en: "Latest payment date", ko: "최근 지급일 순" },
];

// Nulls always sort last, regardless of sort direction — a missing value is
// never "highest" or "lowest," it's just absent from that ranking.
function compareNullsLast(
  a: number | null,
  b: number | null,
  direction: "asc" | "desc"
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function sortDistributionRows(rows: DistributionRow[], sort: SortOption): DistributionRow[] {
  const copy = [...rows];
  switch (sort) {
    case "ticker-asc":
      return copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
    case "amount-desc":
      return copy.sort((a, b) => compareNullsLast(a.distributionPerShare, b.distributionPerShare, "desc"));
    case "rate-desc":
      return copy.sort((a, b) => compareNullsLast(a.distributionRate, b.distributionRate, "desc"));
    case "roc-desc":
      return copy.sort((a, b) => compareNullsLast(a.rocPercent, b.rocPercent, "desc"));
    case "roc-asc":
      return copy.sort((a, b) => compareNullsLast(a.rocPercent, b.rocPercent, "asc"));
    case "pay-date-desc":
      return copy.sort((a, b) => b.payDate.localeCompare(a.payDate));
    default:
      return copy;
  }
}

export function searchDistributionRows(rows: DistributionRow[], query: string): DistributionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.ticker.toLowerCase().includes(q) || (r.etfName ?? "").toLowerCase().includes(q)
  );
}

/** "all" | "freq:Weekly" | "freq:Monthly" | "provider:yieldmax" | ... —
 * derived from whatever frequency/provider values actually exist in the
 * data set (Part 4: "Other issuers when data exists"), never a hard-coded
 * enum that could drift from real data. */
export function filterDistributionRows(rows: DistributionRow[], filter: string): DistributionRow[] {
  if (!filter || filter === "all") return rows;
  if (filter.startsWith("freq:")) {
    const freq = filter.slice("freq:".length);
    return rows.filter((r) => r.frequency === freq);
  }
  if (filter.startsWith("provider:")) {
    const providerId = filter.slice("provider:".length);
    return rows.filter((r) => r.providerId === providerId);
  }
  return rows;
}

/** Shared by DistributionKpis and AnnouncementHeader's hero summary strip —
 * both need "which row has the highest X" from the same row set. */
export function maxBy<T>(rows: T[], key: (r: T) => number | null): T | null {
  let best: T | null = null;
  let bestVal = -Infinity;
  for (const r of rows) {
    const v = key(r);
    if (v != null && v > bestVal) {
      best = r;
      bestVal = v;
    }
  }
  return best;
}

export type FilterChoice = { value: string; label: string; count: number };
export type FilterGroups = { frequency: FilterChoice[]; issuer: FilterChoice[] };

/** Builds the actual available filter chips from the data itself, split
 * into groups by CONCEPT rather than one flat row — Visual Hierarchy Phase
 * 2: mixing payment frequency, issuer, and popular tickers in a single chip
 * row was flagged as the site's highest-priority UX problem, since those
 * are three unrelated facets, not options on the same axis. "All" lives in
 * the frequency group (it resets both facets, but visually anchors the
 * group a reader reaches for first). Issuer labels use providerLabel() so
 * the chip reads "YieldMax", not the raw id "yieldmax". */
export function buildAvailableFilters(rows: DistributionRow[]): FilterGroups {
  const freqCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.frequency) freqCounts.set(r.frequency, (freqCounts.get(r.frequency) ?? 0) + 1);
    providerCounts.set(r.providerId, (providerCounts.get(r.providerId) ?? 0) + 1);
  }
  const frequency: FilterChoice[] = [{ value: "all", label: "All", count: rows.length }];
  for (const [freq, count] of freqCounts) frequency.push({ value: `freq:${freq}`, label: freq, count });
  const issuer: FilterChoice[] = [];
  for (const [providerId, count] of providerCounts)
    issuer.push({ value: `provider:${providerId}`, label: providerLabel(providerId), count });
  return { frequency, issuer };
}

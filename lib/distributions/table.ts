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

export type FilterChoice = { value: string; label: string; count: number };

/** Builds the actual available filter chips from the data itself — "All"
 * plus one chip per distinct frequency and one per distinct provider that
 * has at least one row, each showing a live row count. */
export function buildAvailableFilters(rows: DistributionRow[]): FilterChoice[] {
  const freqCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.frequency) freqCounts.set(r.frequency, (freqCounts.get(r.frequency) ?? 0) + 1);
    providerCounts.set(r.providerId, (providerCounts.get(r.providerId) ?? 0) + 1);
  }
  const choices: FilterChoice[] = [{ value: "all", label: "All", count: rows.length }];
  for (const [freq, count] of freqCounts) choices.push({ value: `freq:${freq}`, label: freq, count });
  for (const [providerId, count] of providerCounts)
    choices.push({ value: `provider:${providerId}`, label: providerId, count });
  return choices;
}

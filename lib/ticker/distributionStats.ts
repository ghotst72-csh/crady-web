export type DistributionAmountRow = { pay_date: string; amount: number | null };

export type AllTimeDistributionStats = {
  count: number;
  total: number | null;
  average: number | null;
  highest: number | null;
  lowest: number | null;
};

/** History tab's "ALL" aggregate — real paid distributions only (amount !=
 * null), over whatever window the caller fetched (Phase 3 uses a
 * generously long one, not a true unbounded "since inception" query, but
 * long enough to cover any currently-tracked ETF's real history). No
 * fabricated backfill for periods before the fetched window. */
export function computeAllTimeDistributionStats(distributions: DistributionAmountRow[]): AllTimeDistributionStats {
  const amounts = distributions
    .filter((d): d is DistributionAmountRow & { amount: number } => d.amount != null)
    .map((d) => d.amount);

  if (amounts.length === 0) {
    return { count: 0, total: null, average: null, highest: null, lowest: null };
  }

  return {
    count: amounts.length,
    total: amounts.reduce((sum, a) => sum + a, 0),
    average: amounts.reduce((sum, a) => sum + a, 0) / amounts.length,
    highest: Math.max(...amounts),
    lowest: Math.min(...amounts),
  };
}

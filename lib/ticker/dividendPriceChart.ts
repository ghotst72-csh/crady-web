export type PriceHistoryPoint = { trade_date: string; close_price: number | null };
export type DistributionPoint = { pay_date: string; amount: number | null };
export type ChartRangeId = "1M" | "3M" | "6M" | "1Y" | "ALL";

export const CHART_RANGES: ChartRangeId[] = ["1M", "3M", "6M", "1Y", "ALL"];

const RANGE_DAYS: Record<Exclude<ChartRangeId, "ALL">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1Y": 365,
};

function cutoffIso(range: ChartRangeId, todayIso: string): string | null {
  if (range === "ALL") return null;
  const days = RANGE_DAYS[range];
  return new Date(new Date(todayIso + "T00:00:00Z").getTime() - days * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function filterHistoryByRange(
  history: PriceHistoryPoint[],
  range: ChartRangeId,
  todayIso: string
): PriceHistoryPoint[] {
  const cutoff = cutoffIso(range, todayIso);
  if (cutoff == null) return history;
  return history.filter((h) => h.trade_date >= cutoff);
}

export function filterDistributionsByRange(
  distributions: DistributionPoint[],
  range: ChartRangeId,
  todayIso: string
): DistributionPoint[] {
  const cutoff = cutoffIso(range, todayIso);
  if (cutoff == null) return distributions;
  return distributions.filter((d) => d.pay_date >= cutoff);
}

export type ChartWindowMetrics = {
  priceChangePct: number | null;
  totalDistributions: number | null;
  distributionCount: number;
};

/** Price change is first-close vs. last-close *within the filtered window*
 * (not a running total vs. today), so it always describes exactly the
 * period the range toggle currently shows. */
export function computeChartWindowMetrics(
  history: PriceHistoryPoint[],
  distributions: DistributionPoint[]
): ChartWindowMetrics {
  const closes = history.map((h) => h.close_price).filter((p): p is number => p != null);
  const priceChangePct =
    closes.length >= 2 && closes[0] !== 0 ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : null;

  const amounts = distributions.map((d) => d.amount).filter((a): a is number => a != null);
  const totalDistributions = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) : null;

  return { priceChangePct, totalDistributions, distributionCount: amounts.length };
}

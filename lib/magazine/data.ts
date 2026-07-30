import {
  getEtf,
  getRiskMetrics,
  getRegimeProfile,
  getLatestPrice,
  getPriceHistory,
  getDistributions,
  getDistributionsSince,
  getNextPrediction,
  getSameProviderEtfs,
  getFutureSchedule,
  getComparisonPeer,
  computeRunRateAnnualYieldPct,
  type EtfRow,
  type RiskMetricsRow,
  type RegimeProfileRow,
  type PriceHistoryRow,
  type DistributionRow,
  type NextPredictionRow,
  type ComparisonPeer,
} from "@/lib/data";

/** Everything a magazine section might need for one ticker, fetched once
 * per article render. Separate from app/[ticker]/page.tsx's own fetch —
 * different route, no request-level dedup would apply across them anyway. */
export type ArticleData = {
  ticker: string;
  etf: EtfRow;
  risk: RiskMetricsRow | null;
  regime: RegimeProfileRow | null;
  price: PriceHistoryRow | null;
  priceHistory: PriceHistoryRow[];
  distributions: DistributionRow[];
  /** Longer paid-distribution window for dividend-history's year-by-year
   * breakdown — kept separate from `distributions` (12 rows) so the
   * existing next-dividend-prediction table doesn't silently grow. */
  distributionsExtended: DistributionRow[];
  /** Scraped future pay/ex dates with no amount yet — the provider's
   * published schedule, distinct from the single predicted next payment. */
  futureSchedule: { ex_date: string; pay_date: string }[];
  prediction: NextPredictionRow | null;
  siblings: { ticker: string; name: string | null }[];
  annualYieldPct: number | null;
  latestPaidDistribution: DistributionRow | null;
  changeFromLastPct: number | null;
  payoutFrequency: string | null;
};

function isKnown(v: string | null): v is string {
  return !!v && v.trim().toLowerCase() !== "unknown";
}

export async function getArticleData(rawTicker: string): Promise<ArticleData | null> {
  const ticker = rawTicker.toUpperCase();
  const etf = await getEtf(ticker);
  if (!etf) return null;

  const [
    risk,
    regime,
    price,
    priceHistory,
    distributions,
    distributionsExtended,
    futureSchedule,
    recentDistributions,
    prediction,
    siblings,
  ] = await Promise.all([
    getRiskMetrics(ticker),
    getRegimeProfile(ticker),
    getLatestPrice(ticker),
    getPriceHistory(ticker, 30),
    getDistributions(ticker, 12),
    getDistributions(ticker, 40),
    getFutureSchedule(ticker, 30),
    getDistributionsSince(ticker, 90),
    getNextPrediction(ticker),
    getSameProviderEtfs(etf.provider_id, ticker, 6),
  ]);

  const annualYieldPct = computeRunRateAnnualYieldPct(
    recentDistributions,
    price?.close_price ?? null
  );
  const latestPaidDistribution = distributions.find((d) => d.amount != null) ?? null;
  const changeFromLastPct =
    latestPaidDistribution?.amount != null &&
    latestPaidDistribution.amount > 0 &&
    prediction?.predicted_amount != null
      ? ((prediction.predicted_amount - latestPaidDistribution.amount) /
          latestPaidDistribution.amount) *
        100
      : null;

  return {
    ticker,
    etf,
    risk,
    regime,
    price,
    priceHistory,
    distributions,
    distributionsExtended,
    futureSchedule,
    prediction,
    siblings,
    annualYieldPct,
    latestPaidDistribution,
    changeFromLastPct,
    payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
  };
}

/** Fetched only for comparison-type pages — a same-provider sibling isn't
 * always present, so callers should treat a null return as "no comparison
 * page for this ticker" rather than rendering a thin one. */
export async function getComparisonPeerData(ticker: string): Promise<ComparisonPeer | null> {
  return getComparisonPeer(ticker);
}

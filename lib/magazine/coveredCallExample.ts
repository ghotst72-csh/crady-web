import { getPriceHistory, getDistributions } from "@/lib/data";
import {
  resolvePurchasePrice,
  latestPriceAtOrBefore,
  computeEligibleDividends,
  computePriceReturn,
  computeTotalReturn,
  detectSplitWarnings,
} from "@/lib/portfolio/calculations";

const EXAMPLE_TICKER = "TSLY";
// Enough rows to comfortably cover a trailing-12-month window plus the
// snap-back margin resolvePurchasePrice needs, and a weekly payer's full
// distribution history for the same window (TSLY pays ~52x/year).
const PRICE_ROWS = 400;
const DISTRIBUTION_ROWS = 100;

export type CoveredCallExample =
  | {
      ok: true;
      ticker: string;
      startDate: string;
      endDate: string;
      startPrice: number;
      endPrice: number;
      priceReturnPct: number;
      distributionsPct: number;
      totalReturnPct: number;
      distributionCount: number;
    }
  | { ok: false; reason: "insufficient-data" | "split-anomaly"; ticker: string };

/** Real "Price Return + Distributions = Total Return" example for the
 * covered-call-etf-guide page's Real Example card — computed from actual
 * production price/distribution data using the exact same pure functions
 * the Portfolio Analyzer uses (lib/portfolio/calculations.ts), on a
 * per-share basis (no invented dollar investment amount) over a trailing
 * 12-month window ending at the latest available trading day. Recomputed
 * on every page render (revalidate = 3600 on the parent route), so the
 * window rolls forward automatically rather than going stale.
 *
 * If detectSplitWarnings finds an unrecorded-split-shaped price jump in
 * the window, this deliberately returns ok:false rather than a number —
 * the pipeline has no split-ratio data to auto-adjust historical prices
 * (see calculations.ts), so a real split would silently produce a wrong
 * return figure. TSLY has none across its full history as of this
 * writing (verified by hand against the live DB), but the guard stays in
 * the code path rather than being assumed away. */
export async function getCoveredCallExample(): Promise<CoveredCallExample> {
  const [history, distributions] = await Promise.all([
    getPriceHistory(EXAMPLE_TICKER, PRICE_ROWS),
    getDistributions(EXAMPLE_TICKER, DISTRIBUTION_ROWS),
  ]);

  const validHistory = history.filter((h): h is { ticker: string; trade_date: string; close_price: number } => h.close_price != null);
  if (validHistory.length < 2) return { ok: false, reason: "insufficient-data", ticker: EXAMPLE_TICKER };

  const latestPoint = validHistory[validHistory.length - 1];
  const requestedStart = new Date(`${latestPoint.trade_date}T00:00:00Z`);
  requestedStart.setUTCDate(requestedStart.getUTCDate() - 365);
  const requestedStartIso = requestedStart.toISOString().slice(0, 10);

  const start = resolvePurchasePrice(history, requestedStartIso, null);
  const end = latestPriceAtOrBefore(history, latestPoint.trade_date);
  if (!start || !end) return { ok: false, reason: "insufficient-data", ticker: EXAMPLE_TICKER };

  const splitWarnings = detectSplitWarnings(history, start.effectiveDate, end.trade_date);
  if (splitWarnings.length > 0) return { ok: false, reason: "split-anomaly", ticker: EXAMPLE_TICKER };

  // shares = 1 → a clean per-share basis; the percentages are identical
  // for any dollar amount, so no hypothetical investment size is invented.
  const eligible = computeEligibleDividends(distributions, start.effectiveDate, 1);
  const totalDividendsReceived = eligible.reduce((sum, d) => sum + d.totalReceived, 0);

  const priceReturn = computePriceReturn(start.effectivePrice, end.close_price);
  const totalReturn = computeTotalReturn(start.effectivePrice, end.close_price, totalDividendsReceived);
  const distributionsPct = start.effectivePrice > 0 ? (totalDividendsReceived / start.effectivePrice) * 100 : null;

  if (priceReturn.pct == null || totalReturn.pct == null || distributionsPct == null) {
    return { ok: false, reason: "insufficient-data", ticker: EXAMPLE_TICKER };
  }

  return {
    ok: true,
    ticker: EXAMPLE_TICKER,
    startDate: start.effectiveDate,
    endDate: end.trade_date,
    startPrice: start.effectivePrice,
    endPrice: end.close_price,
    priceReturnPct: priceReturn.pct,
    distributionsPct,
    totalReturnPct: totalReturn.pct,
    distributionCount: eligible.length,
  };
}

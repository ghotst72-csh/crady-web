"use server";

import { getEtf, getPriceHistory, getDistributions } from "@/lib/data";
import {
  resolvePurchasePrice,
  latestPriceAtOrBefore,
  computeEligibleDividends,
  computeTotalReturn,
  detectSplitWarnings,
} from "@/lib/portfolio/calculations";

const PRICE_ROWS = 400;
const DISTRIBUTION_ROWS = 100;

export type RealEtfStats = {
  ticker: string;
  name: string | null;
  providerId: string;
  currentPrice: number | null;
  /** Parsed from etfs.expense_ratio (a string like "1.07%") — null when
   * absent or literally "unknown", never guessed. */
  expenseRatioPct: number | null;
  /** Trailing-90-day run-rate annualized distribution yield, same figure
   * and formula shown everywhere else on CRADY (computeRunRateAnnualYieldPct
   * via the home snapshot) — not recomputed independently here so it never
   * silently disagrees with what the rest of the site shows for this ticker. */
  distributionYieldPct: number | null;
  cradyScore: number | null;
  /** Real trailing-12-month total return (price + distributions), computed
   * the same way as the Real Example card on /magazine/covered-call-etf-guide
   * — reused pattern, not reused code (that page's helper stays untouched;
   * this is a ticker-agnostic sibling). Null when there's under a year of
   * real price history, or when detectSplitWarnings finds an unrecorded-
   * split-shaped price jump in the window (never a distorted number). */
  trailingTotalReturnPct: number | null;
  trailingReturnStartDate: string | null;
  trailingReturnEndDate: string | null;
  trailingReturnUnavailableReason: "insufficient-data" | "split-anomaly" | null;
};

function parseExpenseRatioPct(raw: string | null): number | null {
  if (!raw || raw.trim().toLowerCase() === "unknown") return null;
  const n = parseFloat(raw.replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

/** `snapshotHint` — the caller's already-fetched search-index row for this
 * ticker (the same SearchEntry the ETF picker's search index already has —
 * see lib/search/searchTickers.ts) — avoids a second query per ticker
 * selection. Pass null if unavailable; yield/cradyScore just come back
 * null in that case rather than triggering a redundant query. SearchEntry
 * carries no price field, so currentPrice is always sourced elsewhere
 * (null today — see the RealEtfStats doc comment). */
export async function getRealEtfStats(
  ticker: string,
  snapshotHint: { name: string | null; provider_id: string; annualYieldPct: number | null; cradyScore: number | null } | null
): Promise<RealEtfStats | null> {
  const etf = await getEtf(ticker);
  if (!etf && !snapshotHint) return null;

  const expenseRatioPct = parseExpenseRatioPct(etf?.expense_ratio ?? null);

  const [history, distributions] = await Promise.all([
    getPriceHistory(ticker, PRICE_ROWS),
    getDistributions(ticker, DISTRIBUTION_ROWS),
  ]);

  const validHistory = history.filter((h): h is { ticker: string; trade_date: string; close_price: number } => h.close_price != null);
  const currentPrice = validHistory.length > 0 ? validHistory[validHistory.length - 1].close_price : null;

  let trailingTotalReturnPct: number | null = null;
  let trailingReturnStartDate: string | null = null;
  let trailingReturnEndDate: string | null = null;
  let trailingReturnUnavailableReason: RealEtfStats["trailingReturnUnavailableReason"] = "insufficient-data";

  if (validHistory.length >= 2) {
    const latestPoint = validHistory[validHistory.length - 1];
    const requestedStart = new Date(`${latestPoint.trade_date}T00:00:00Z`);
    requestedStart.setUTCDate(requestedStart.getUTCDate() - 365);
    const requestedStartIso = requestedStart.toISOString().slice(0, 10);

    const start = resolvePurchasePrice(history, requestedStartIso, null);
    const end = latestPriceAtOrBefore(history, latestPoint.trade_date);

    if (start && end) {
      const splitWarnings = detectSplitWarnings(history, start.effectiveDate, end.trade_date);
      if (splitWarnings.length > 0) {
        trailingReturnUnavailableReason = "split-anomaly";
      } else {
        const eligible = computeEligibleDividends(distributions, start.effectiveDate, 1);
        const totalDividendsReceived = eligible.reduce((sum, d) => sum + d.totalReceived, 0);
        const totalReturn = computeTotalReturn(start.effectivePrice, end.close_price, totalDividendsReceived);
        if (totalReturn.pct != null) {
          trailingTotalReturnPct = totalReturn.pct;
          trailingReturnStartDate = start.effectiveDate;
          trailingReturnEndDate = end.trade_date;
          trailingReturnUnavailableReason = null;
        }
      }
    }
  }

  return {
    ticker,
    name: etf?.name ?? snapshotHint?.name ?? null,
    providerId: etf?.provider_id ?? snapshotHint?.provider_id ?? "unknown",
    currentPrice,
    expenseRatioPct,
    distributionYieldPct: snapshotHint?.annualYieldPct ?? null,
    cradyScore: snapshotHint?.cradyScore ?? null,
    trailingTotalReturnPct,
    trailingReturnStartDate,
    trailingReturnEndDate,
    trailingReturnUnavailableReason,
  };
}

/** CRADY Compare — pure per-ticker orchestration, no I/O. Every return
 * figure here comes from computeHistoricalReturn (lib/etfCalculator/
 * historicalReturnCalc.ts) — the exact same engine the ETF Calculator
 * uses — so Total Return can never disagree between the two tools. This
 * file adds nothing to that formula; it only maps its result onto the
 * comparison table's shape and adds Max Drawdown over the same resolved
 * window (a metric the calculator doesn't need but Compare does). */

import { computeHistoricalReturn } from "@/lib/etfCalculator/historicalReturnCalc";
import {
  computeMaxDrawdownPct,
  type PriceHistoryPoint,
  type DistributionPoint,
  type SplitWarning,
} from "@/lib/portfolio/calculations";

/** Fixed notional so every ticker's Total Distributions ($ figure) is
 * directly comparable — same default the ETF Calculator itself uses. */
export const COMPARE_NOTIONAL_INVESTMENT = 10_000;

export type PeriodReturnFailureReason = "insufficient-history" | "split-anomaly" | "invalid-range";

export type PeriodReturnResult =
  | {
      ok: true;
      ticker: string;
      startDateResolved: string;
      endDateResolved: string;
      startDateAdjusted: boolean;
      endDateAdjusted: boolean;
      totalReturnPct: number;
      annualizedReturnPct: number | null;
      priceReturnPct: number | null;
      totalDistributionsReceived: number;
      maxDrawdownPct: number | null;
      holdingDays: number;
    }
  | {
      ok: false;
      ticker: string;
      reason: PeriodReturnFailureReason;
      splitWarnings?: SplitWarning[];
    };

/** not-listed-yet / insufficient-data both collapse into one
 * "insufficient-history" bucket — that's the fairness rule: an ETF that
 * can't cover the requested window is excluded/flagged, never silently
 * compared over a shorter period than its peers. split-anomaly and
 * invalid-range stay distinct — a detected split is a data-integrity
 * signal, not a launch-date issue, and must never be lumped in with
 * "too young to compare." */
export function computePeriodReturn(
  ticker: string,
  history: PriceHistoryPoint[],
  distributions: DistributionPoint[],
  startDate: string,
  endDate: string
): PeriodReturnResult {
  const r = computeHistoricalReturn(history, distributions, startDate, endDate, COMPARE_NOTIONAL_INVESTMENT);

  if (!r.ok) {
    const reason: PeriodReturnFailureReason =
      r.reason === "not-listed-yet" || r.reason === "insufficient-data" ? "insufficient-history" : r.reason;
    return { ok: false, ticker, reason, splitWarnings: r.splitWarnings };
  }

  const windowCloses = history
    .filter((h) => h.close_price != null && h.trade_date >= r.purchaseDate && h.trade_date <= r.saleDate)
    .map((h) => h.close_price as number);

  return {
    ok: true,
    ticker,
    startDateResolved: r.purchaseDate,
    endDateResolved: r.saleDate,
    startDateAdjusted: r.purchaseDateAdjusted,
    endDateAdjusted: r.saleDateAdjusted,
    totalReturnPct: r.totalReturnPctCash ?? 0,
    annualizedReturnPct: r.annualizedReturnPctCash,
    priceReturnPct: r.priceReturnPct,
    totalDistributionsReceived: r.totalDistributionsReceived,
    maxDrawdownPct: computeMaxDrawdownPct(windowCloses),
    holdingDays: r.holdingDays,
  };
}

/** Generic "which ticker wins this column" helper, reused once per metric
 * in the results grid. A plain numeric max works for every metric this
 * page shows, INCLUDING Max Drawdown — computeMaxDrawdownPct returns a
 * value <= 0 (more negative = worse), so the numerically highest value is
 * already the least-negative (best/lowest-risk) one. Callers are
 * responsible for never mislabeling what "highest" means in the UI (e.g.
 * "Lowest Drawdown" for that column, not "Highest Drawdown"). */
export function pickBestTicker(entries: { ticker: string; value: number | null }[]): string | null {
  let best: { ticker: string; value: number } | null = null;
  for (const e of entries) {
    if (e.value == null) continue;
    if (!best || e.value > best.value) best = { ticker: e.ticker, value: e.value };
  }
  return best?.ticker ?? null;
}

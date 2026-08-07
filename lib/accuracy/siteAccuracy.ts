import type { SitewideEvaluatedPredictionRow } from "@/lib/distributions/data";

/** CRADY Phase 2 §11 — Prediction Accuracy trust-layer math. Every number
 * here is computed directly from real, pipeline-evaluated predictions
 * (dividend_predictions rows with a real actual_amount, already deduped to
 * one row per real ticker+target_pay_date event by the caller). No
 * threshold or bucket is invented — "matched" / "close" / "high_error" are
 * the pipeline's own real evaluation_status categories, surfaced as-is. */

export type SiteAccuracySummary = {
  evaluatedCount: number;
  tickerCount: number;
  averageAbsoluteErrorPct: number | null;
  medianAbsoluteErrorPct: number | null;
  statusCounts: { matched: number; close: number; high_error: number };
  withinRangeCounts: { within10: number; within15: number; within25: number };
};

export function computeSiteAccuracy(rows: SitewideEvaluatedPredictionRow[]): SiteAccuracySummary {
  const statusCounts = { matched: 0, close: 0, high_error: 0 };
  const errors: number[] = [];
  let within10 = 0;
  let within15 = 0;
  let within25 = 0;

  for (const r of rows) {
    if (r.evaluationStatus === "matched" || r.evaluationStatus === "close" || r.evaluationStatus === "high_error") {
      statusCounts[r.evaluationStatus]++;
    }
    if (r.percentageError != null) {
      const abs = Math.abs(r.percentageError);
      errors.push(abs);
      if (abs <= 10) within10++;
      if (abs <= 15) within15++;
      if (abs <= 25) within25++;
    }
  }

  const sorted = [...errors].sort((a, b) => a - b);
  const averageAbsoluteErrorPct = errors.length > 0 ? errors.reduce((s, e) => s + e, 0) / errors.length : null;
  const medianAbsoluteErrorPct =
    sorted.length > 0
      ? sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : null;

  return {
    evaluatedCount: rows.length,
    tickerCount: new Set(rows.map((r) => r.ticker)).size,
    averageAbsoluteErrorPct,
    medianAbsoluteErrorPct,
    statusCounts,
    withinRangeCounts: { within10, within15, within25 },
  };
}

export type TickerAccuracyRow = {
  ticker: string;
  count: number;
  averageAbsoluteErrorPct: number | null;
};

/** Per-ticker breakdown, most-evaluated first — real per-ETF track
 * records, never a synthetic sitewide-only number. Tickers with fewer than
 * `minCount` evaluated predictions are excluded — a 1-of-1 "100% accurate"
 * row would be statistically meaningless and misleadingly prominent. */
export function computeTickerAccuracy(rows: SitewideEvaluatedPredictionRow[], minCount = 3): TickerAccuracyRow[] {
  const byTicker = new Map<string, number[]>();
  for (const r of rows) {
    if (r.percentageError == null) continue;
    const list = byTicker.get(r.ticker) ?? [];
    list.push(Math.abs(r.percentageError));
    byTicker.set(r.ticker, list);
  }

  const out: TickerAccuracyRow[] = [];
  for (const [ticker, errors] of byTicker) {
    if (errors.length < minCount) continue;
    out.push({
      ticker,
      count: errors.length,
      averageAbsoluteErrorPct: errors.reduce((s, e) => s + e, 0) / errors.length,
    });
  }
  return out.sort((a, b) => (a.averageAbsoluteErrorPct ?? Infinity) - (b.averageAbsoluteErrorPct ?? Infinity));
}

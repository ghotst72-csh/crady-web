import type { EtfSnapshot } from "@/lib/data";
import type { AutomatedActivityItem } from "@/lib/activity/types";

/** CRADY Intelligence 4.0, Item #3 — "Weekly Intelligence." Computed live
 * at request time from real, already-real-time data (same precedent as
 * lib/activity/aiOutlook.ts's buildWeeklyRecap) — no cron, no stored
 * artifact. Six buckets:
 * - distributions: distribution_event activity in the trailing 7 days
 * - scoreChanges: score_change activity (the signal that actually fires
 *   in production — confirmed 148 events/30d during research)
 * - riskLevelChanges: risk_level_change activity (schema-ready, but
 *   honestly rare/empty in the real data seen while building this)
 * - predictionChanges: prediction_change activity (same honesty note)
 * - upcomingExDates: real ex-dates in the next 7 days, from the Home
 *   page's existing EtfSnapshot[] — zero new query
 * - yieldMovers: tickers whose most recent distribution moved meaningfully
 *   vs. their recent average (EtfSnapshot.dividendTrendPct) — a distribution
 *   increase mechanically raises the run-rate annualized yield at a given
 *   price, so this is a real, defensible proxy for "yield changes," not a
 *   separately-tracked yield-history figure (none exists). */

export type WeeklyTicker = { ticker: string; label: string };

export type WeeklyIntelligence = {
  distributions: WeeklyTicker[];
  scoreChanges: WeeklyTicker[];
  riskLevelChanges: WeeklyTicker[];
  predictionChanges: WeeklyTicker[];
  upcomingExDates: WeeklyTicker[];
  yieldMovers: WeeklyTicker[];
};

const NOTABLE_TREND_PCT = 5;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildWeeklyIntelligence(
  snapshot: EtfSnapshot[],
  changeEvents7d: AutomatedActivityItem[],
  today: Date = new Date()
): WeeklyIntelligence {
  const distributions: WeeklyTicker[] = [];
  const scoreChanges: WeeklyTicker[] = [];
  const riskLevelChanges: WeeklyTicker[] = [];
  const predictionChanges: WeeklyTicker[] = [];

  for (const item of changeEvents7d) {
    const entry = { ticker: item.ticker, label: item.title };
    if (item.type === "distribution_event") distributions.push(entry);
    else if (item.type === "score_change") scoreChanges.push(entry);
    else if (item.type === "risk_level_change") riskLevelChanges.push(entry);
    else if (item.type === "prediction_change") predictionChanges.push(entry);
  }

  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const todayIso = isoDate(today);
  const weekAheadIso = isoDate(weekAhead);
  const upcomingExDates: WeeklyTicker[] = snapshot
    .filter((s) => s.nextPredictedExDate != null && s.nextPredictedExDate >= todayIso && s.nextPredictedExDate <= weekAheadIso)
    .sort((a, b) => (a.nextPredictedExDate! < b.nextPredictedExDate! ? -1 : 1))
    .map((s) => ({ ticker: s.ticker, label: s.nextPredictedExDate! }));

  const yieldMovers: WeeklyTicker[] = snapshot
    .filter((s) => s.dividendTrendPct != null && Math.abs(s.dividendTrendPct) >= NOTABLE_TREND_PCT)
    .sort((a, b) => Math.abs(b.dividendTrendPct!) - Math.abs(a.dividendTrendPct!))
    .slice(0, 10)
    .map((s) => ({ ticker: s.ticker, label: `${s.dividendTrendPct! >= 0 ? "+" : ""}${s.dividendTrendPct!.toFixed(1)}%` }));

  return { distributions, scoreChanges, riskLevelChanges, predictionChanges, upcomingExDates, yieldMovers };
}

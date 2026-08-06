import type { EtfSnapshot } from "@/lib/data";
import type { AutomatedActivityItem } from "@/lib/activity/types";

/** CRADY Intelligence 4.0, Item #10 — "Home Intelligence." Every bucket
 * comes from real, already-fetched data:
 * - todayChanged / declaredToday / predictionRaised / predictionLowered:
 *   real activity_items change-events from today (see
 *   lib/activity/data.ts's getRecentChangeEvents({days:1})).
 * - tomorrowExDate: derived from the Home page's existing EtfSnapshot[]
 *   (nextPredictedExDate), zero new query.
 *
 * Honest reality check (documented, not hidden): prediction_change and
 * confidence_change events have had zero real occurrences in the 30 days
 * checked while building this — score_change is the primary signal that
 * actually fires. predictionRaised/predictionLowered will typically be
 * empty arrays today; that's a correct, honest result, not a bug. */

export type HomeIntelligenceTicker = { ticker: string; label: string };

export type HomeIntelligence = {
  todayChanged: HomeIntelligenceTicker[];
  declaredToday: HomeIntelligenceTicker[];
  predictionRaised: HomeIntelligenceTicker[];
  predictionLowered: HomeIntelligenceTicker[];
  tomorrowExDate: HomeIntelligenceTicker[];
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function metricNumber(metrics: Record<string, unknown> | null, key: string): number | null {
  const v = metrics?.[key];
  return typeof v === "number" ? v : null;
}

export function buildHomeIntelligence(
  snapshot: EtfSnapshot[],
  changeEventsToday: AutomatedActivityItem[],
  lang: "en" | "ko" = "en",
  today: Date = new Date()
): HomeIntelligence {
  const todayChanged: HomeIntelligenceTicker[] = [];
  const declaredToday: HomeIntelligenceTicker[] = [];
  const predictionRaised: HomeIntelligenceTicker[] = [];
  const predictionLowered: HomeIntelligenceTicker[] = [];

  for (const item of changeEventsToday) {
    if (item.type === "score_change") {
      const score = metricNumber(item.supportingMetrics, "score");
      const previous = metricNumber(item.supportingMetrics, "previous_score");
      const label =
        score != null && previous != null
          ? lang === "ko"
            ? `${previous.toFixed(1)} → ${score.toFixed(1)}`
            : `${previous.toFixed(1)} → ${score.toFixed(1)}`
          : item.title;
      todayChanged.push({ ticker: item.ticker, label });
    } else if (item.type === "distribution_event") {
      declaredToday.push({ ticker: item.ticker, label: item.title });
    } else if (item.type === "prediction_change") {
      const amount = metricNumber(item.supportingMetrics, "predicted_amount") ?? metricNumber(item.supportingMetrics, "amount");
      const previous = metricNumber(item.supportingMetrics, "previous_amount");
      const label = amount != null && previous != null ? `$${previous.toFixed(4)} → $${amount.toFixed(4)}` : item.title;
      if (amount != null && previous != null) {
        (amount >= previous ? predictionRaised : predictionLowered).push({ ticker: item.ticker, label });
      } else {
        predictionRaised.push({ ticker: item.ticker, label });
      }
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = isoDate(tomorrow);
  const tomorrowExDate: HomeIntelligenceTicker[] = snapshot
    .filter((s) => s.nextPredictedExDate === tomorrowIso)
    .map((s) => ({ ticker: s.ticker, label: s.nextPredictedAmount != null ? `$${s.nextPredictedAmount.toFixed(4)}` : "—" }));

  return { todayChanged, declaredToday, predictionRaised, predictionLowered, tomorrowExDate };
}

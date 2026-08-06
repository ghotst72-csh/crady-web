/** CRADY Intelligence 4.0 — the 6-node ETF lifecycle timeline (Prediction
 * → Declaration → Ex-Date → Payment → Performance Review → Next
 * Prediction). Extends the existing 3-stage `getDividendStage`
 * (lib/dividend.ts) rather than replacing it — that function still backs
 * the compact DividendStagePill badge used elsewhere; this is the fuller
 * 6-node version for the new timeline component. Every stage boundary is
 * a real date/data-presence check, never inferred. */

export type LifecycleStage = "prediction" | "declaration" | "ex-date" | "payment" | "performance-review" | "next-prediction";

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "prediction",
  "declaration",
  "ex-date",
  "payment",
  "performance-review",
  "next-prediction",
];

export type LifecycleInput = {
  today?: Date;
  /** The upcoming/current cycle's dates — a real scraped schedule row when
   * one exists, otherwise CRADY's own pattern-based estimate (either is
   * fine here; this only asks "has this milestone date been reached",
   * not which source it came from). */
  cycleDeclarationDate: string | null;
  cycleExDate: string | null;
  cyclePayDate: string | null;
  /** True once a next_predictions row exists for the cycle AFTER this one
   * — the real signal that closes the loop back to "prediction". */
  hasNextCyclePrediction: boolean;
  /** True once the most recently paid cycle has a resolved
   * (matched/close/high_error) accuracy evaluation — see
   * getPredictionVsOfficial. */
  lastCycleEvaluated: boolean;
};

function isPast(dateIso: string | null, today: Date): boolean {
  if (!dateIso) return false;
  return today.getTime() >= new Date(dateIso + "T00:00:00").getTime();
}

export function computeLifecycleStage(input: LifecycleInput): LifecycleStage {
  const today = input.today ?? new Date();

  if (!isPast(input.cyclePayDate, today)) {
    if (!isPast(input.cycleExDate, today)) {
      return isPast(input.cycleDeclarationDate, today) ? "declaration" : "prediction";
    }
    return "ex-date";
  }

  // Payment has occurred for this cycle.
  if (input.hasNextCyclePrediction) return "next-prediction";
  if (input.lastCycleEvaluated) return "performance-review";
  return "payment";
}

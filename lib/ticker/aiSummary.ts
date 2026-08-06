import type { ScoreBreakdown } from "./scoreExplain";
import { buildScoreNarrative } from "./scoreExplain";
import type { RiskContext } from "./riskExplain";
import { riskItemLabel, formatRiskItemValue } from "./riskExplain";
import type { YieldExplanation } from "./yieldExplain";

/** CRADY Intelligence 4.0, Item #9 — a 5–8 sentence, rule-based daily
 * summary. NEVER calls an LLM — every sentence is assembled from the
 * other explainer modules' real output (already independently tested),
 * so this file has almost no logic of its own beyond composition. "Daily
 * auto-update" is satisfied by being computed at request time under the
 * page's existing revalidate window (same pattern as the site's other
 * rule-based "AI"-labeled content, e.g. lib/activity/aiOutlook.ts) — no
 * cron, no stored artifact.
 *
 * Low-data tickers will honestly produce fewer than 5 sentences when
 * several inputs are null — that's the correct behavior (never pad with
 * filler to hit a sentence-count target), not a bug. */

export type AiSummaryInput = {
  ticker: string;
  directAnswer: string | null;
  /** Real, pipeline-authored one-line description (etf_risk_metrics.notes)
   * — populated for 27/73 tickers. */
  notes: string | null;
  yieldExplanation: YieldExplanation | null;
  scoreBreakdown: ScoreBreakdown | null;
  riskContext: RiskContext | null;
};

export function buildDailySummary(input: AiSummaryInput, lang: "en" | "ko" = "en"): string[] {
  const sentences: string[] = [];

  if (input.directAnswer) sentences.push(input.directAnswer);
  // etf_risk_metrics.notes is authored in Korean only (confirmed by
  // sampling live data) — including it on the English summary would mix
  // languages mid-paragraph, so it's real data gated to the "ko" summary.
  if (input.notes && lang === "ko") sentences.push(input.notes);

  if (input.yieldExplanation) {
    sentences.push(
      lang === "ko"
        ? `현재 연환산 분배율은 ${input.yieldExplanation.formula.toLowerCase()}`
        : `The current annualized yield is ${input.yieldExplanation.formula.charAt(0).toLowerCase()}${input.yieldExplanation.formula.slice(1)}`
    );
    if (input.yieldExplanation.factors[0]) sentences.push(input.yieldExplanation.factors[0]);
  }

  if (input.scoreBreakdown) {
    const narrative = buildScoreNarrative(input.scoreBreakdown, lang);
    if (narrative[0]) sentences.push(narrative[0]);
  }

  if (input.riskContext && input.riskContext.items.length > 0) {
    const top = input.riskContext.items[0];
    sentences.push(
      lang === "ko"
        ? `위험 등급은 ${input.riskContext.riskLevel}이며, ${riskItemLabel(top.key, "ko")}은(는) ${formatRiskItemValue(top)}입니다.`
        : `The risk classification is ${input.riskContext.riskLevel}, with ${riskItemLabel(top.key, "en").toLowerCase()} at ${formatRiskItemValue(top)}.`
    );
  }

  return sentences;
}

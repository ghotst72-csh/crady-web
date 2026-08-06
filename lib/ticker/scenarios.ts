import { computeExpectedRange } from "./nextDividendIntelligence";

/** CRADY Intelligence 4.0 — Bull / Base / Bear next-dividend scenarios.
 *
 * Deliberately reuses the same real, stddev-based `computeExpectedRange`
 * already used elsewhere for the "expected range" feature, rather than
 * inventing a second, unproven spread model. Bull = the high end of that
 * real range, Bear = the low end, Base = CRADY's actual point estimate.
 * Framed explicitly as "possible scenarios," never a recommendation or a
 * probability — per the spec's own instruction. Returns null under the
 * same minimum-sample rule as `computeExpectedRange` (never a fabricated
 * spread from too little data). */

export type ScenarioInput = {
  pointEstimate: number | null;
  recentAmounts: number[];
};

export type Scenario = { amount: number };

export type Scenarios = {
  bull: Scenario;
  base: Scenario;
  bear: Scenario;
};

export function buildScenarios(input: ScenarioInput): Scenarios | null {
  if (input.pointEstimate == null) return null;
  const range = computeExpectedRange(input.recentAmounts, input.pointEstimate);
  if (!range) return null;
  return {
    bull: { amount: range.high },
    base: { amount: input.pointEstimate },
    bear: { amount: range.low },
  };
}

export function buildScenarioNarrative(lang: "en" | "ko" = "en"): { bull: string; base: string; bear: string } {
  return lang === "ko"
    ? {
        bull: "최근 분배금 변동 범위의 상단에 가까운 흐름이 이어질 경우의 시나리오입니다.",
        base: "CRADY의 현재 예상치이며, 별도 조정을 가하지 않은 값입니다.",
        bear: "최근 분배금 변동 범위의 하단에 가까운 흐름이 이어질 경우의 시나리오입니다.",
      }
    : {
        bull: "Assumes distributions continue near the higher end of their recent variability.",
        base: "CRADY's current point estimate, unadjusted.",
        bear: "Assumes distributions trend toward the lower end of their recent variability.",
      };
}

export const SCENARIO_DISCLAIMER = {
  en: "These are possible scenarios based on recent distribution variability — not predictions, recommendations, or guarantees of what will happen.",
  ko: "이는 최근 분배금 변동성을 바탕으로 한 가능한 시나리오이며, 예측·추천이나 결과를 보장하는 수치가 아닙니다.",
} as const;

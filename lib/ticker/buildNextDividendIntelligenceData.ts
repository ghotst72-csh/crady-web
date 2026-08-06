import {
  buildDividendSchedule,
  computeTypicalDeclarationToExDays,
  computeExpectedRange,
  classifyEtfType,
  buildEstimateDrivers,
  buildTrackRecord,
  buildSchedulePattern,
} from "./nextDividendIntelligence";
import { buildWhyThisEstimate, buildEstimateFactors, buildWhatWouldChangeThis } from "./nextDividendNarrative";
import type { NextDividendIntelligenceData } from "@/components/ticker/NextDividendIntelligence";
import type { FullNextPrediction, NextScheduleRow, RecentDeclaredDistribution } from "./nextDividendData";
import type { EvaluatedPredictionRow, PredictionVsOfficial } from "@/lib/distributions/data";

/** Recent-and-relevant window for showing a just-resolved forecast as the
 * prominent "auto-transition" comparison (§8) rather than burying it only
 * in the Track Record accordion. */
const RECENT_TRANSITION_DAYS = 14;

export function buildNextDividendIntelligenceData(input: {
  ticker: string;
  scheduleRow: NextScheduleRow | null;
  prediction: FullNextPrediction | null;
  recentDeclared: RecentDeclaredDistribution[];
  evaluatedHistory: EvaluatedPredictionRow[];
  latestEvaluated: PredictionVsOfficial | null;
  strategyType: string | null;
  underlyingTicker: string | null;
  assetClass: string | null;
  volatility30d: number | null;
  payoutFrequency: string | null;
  todayIso: string;
  lang: "en" | "ko";
  /** Intelligence 4.0 — the underlying stock's own real trailing
   * volatility (lib/ticker/underlyingMomentum.ts), when one exists. */
  underlyingVolatility30d?: number | null;
}): NextDividendIntelligenceData {
  const {
    ticker,
    scheduleRow,
    prediction,
    recentDeclared,
    evaluatedHistory,
    latestEvaluated,
    strategyType,
    underlyingTicker,
    assetClass,
    volatility30d,
    payoutFrequency,
    todayIso,
    lang,
    underlyingVolatility30d = null,
  } = input;

  const typicalGap = computeTypicalDeclarationToExDays(
    recentDeclared.map((r) => ({ declarationDate: r.declarationDate, exDate: r.exDate }))
  );

  const schedule = buildDividendSchedule({
    scheduleRow,
    prediction: prediction ? { targetExDate: prediction.targetExDate, targetPayDate: prediction.targetPayDate } : null,
    typicalDeclarationToExDays: typicalGap,
  });

  const recentAmounts = recentDeclared.map((r) => r.amount);
  const previousAmount = recentAmounts[0] ?? null;
  const pointEstimate = prediction?.predictedAmount ?? null;
  const expectedRange = pointEstimate != null ? computeExpectedRange(recentAmounts, pointEstimate) : null;

  const avg4 =
    recentAmounts.length > 0 ? recentAmounts.slice(0, 4).reduce((a, b) => a + b, 0) / Math.min(4, recentAmounts.length) : null;
  const avg12 =
    recentAmounts.length > 0 ? recentAmounts.slice(0, 12).reduce((a, b) => a + b, 0) / Math.min(12, recentAmounts.length) : null;

  const etfType = classifyEtfType({ strategyType, underlyingTicker, assetClass });
  const hasVolatilityData = volatility30d != null;

  const whyThisEstimate =
    pointEstimate != null
      ? buildWhyThisEstimate(
          {
            ticker,
            etfType,
            underlyingTicker,
            underlyingMovementPct: null, // honest — no underlying stock price data exists in this pipeline
            hasVolatilityData,
            volatilityPct: volatility30d,
            recentAmountsCount: recentAmounts.length,
            payoutFrequency,
            pointEstimate,
          },
          lang
        )
      : "";

  const drivers = buildEstimateDrivers({
    recentAmountsCount: recentAmounts.length,
    hasVolatilityData,
    hasUnderlyingPriceData: false,
    isOfficiallyDeclared: false,
  });

  const schedulePattern = buildSchedulePattern(
    recentDeclared.map((r) => ({ declarationDate: r.declarationDate, exDate: r.exDate, payDate: r.payDate }))
  );

  const trackRecord = buildTrackRecord(
    evaluatedHistory.map((r) => ({
      targetPayDate: r.targetPayDate,
      predictedAmount: r.predictedAmount,
      actualAmount: r.actualAmount,
      percentageError: r.percentageError,
    }))
  );

  const forecastVsOfficial =
    latestEvaluated && daysSince(latestEvaluated.targetPayDate, todayIso) <= RECENT_TRANSITION_DAYS
      ? {
          predictedAmount: latestEvaluated.predictedAmount,
          actualAmount: latestEvaluated.actualAmount,
          errorPct: latestEvaluated.percentageError,
        }
      : null;

  const estimateFactors = buildEstimateFactors(
    {
      recentAmountsCount: recentAmounts.length,
      isOfficiallyDeclared: false,
      underlyingVolatility30d,
      hasUnderlyingTicker: underlyingTicker != null,
      underlyingTicker,
    },
    lang
  );
  const whatWouldChangeThis = buildWhatWouldChangeThis(
    { isOfficiallyDeclared: false, hasUnderlyingTicker: underlyingTicker != null, underlyingTicker },
    lang
  );

  return {
    ticker,
    schedule,
    isOfficial: false,
    officialAmount: null,
    pointEstimate,
    expectedRange,
    confidence: prediction?.confidenceScore ?? null,
    previousAmount,
    whyThisEstimate,
    drivers,
    recentAmounts,
    avg4,
    avg12,
    schedulePattern,
    trackRecord,
    forecastVsOfficial,
    estimateFactors,
    whatWouldChangeThis,
  };
}

function daysSince(fromIso: string, todayIso: string): number {
  return Math.round((new Date(todayIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
}

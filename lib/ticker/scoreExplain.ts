/** CRADY Intelligence 4.0 — CRADY Score breakdown.
 *
 * This reproduces the REAL formula found in the separate Python pipeline
 * (C:\CRADY\calculate_crady_score.py::calculate_crady_score()), verified
 * by hand against a live ticker (TSLY: computed 33.635, live crady_score
 * was 33.63). It is a *replica* for display purposes, not a live call —
 * if the pipeline's weights or defaults ever change, this file needs a
 * matching update, or the breakdown will silently drift from the real
 * number. That risk is documented here deliberately so it isn't missed.
 *
 * Weights: dividend_stability 35%, recovery 18%, drawdown_quality 17%,
 * volatility_quality 12%, trend 10%, momentum 8%, minus a flat risk_level
 * penalty (SAFE=0, NORMAL=4, RISKY=9, EXTREME=16, other=12). Any missing
 * sub-score falls back to the pipeline's own documented default rather
 * than being treated as zero — and is flagged `usedDefault: true` so the
 * UI can say so, instead of silently passing off a placeholder as real
 * data. */

export type RiskInput = {
  cradyScore: number | null;
  riskLevel: string | null;
  dividendStabilityScore: number | null;
  recoveryScore: number | null;
  maxDrawdown: number | null;
  volatility30d: number | null;
  trendScore: number | null;
  momentumScore: number | null;
};

export type ScoreComponent = {
  key: "dividendStability" | "recovery" | "drawdownQuality" | "volatilityQuality" | "trend" | "momentum";
  rawValue: number;
  weightPct: number;
  points: number;
  usedDefault: boolean;
};

export type ScoreBreakdown = {
  components: ScoreComponent[];
  riskPenalty: { points: number; riskLevel: string | null };
  total: number;
  /** The live crady_score this breakdown is explaining — compared against
   * `total` only for an internal sanity margin, never shown as a
   * discrepancy to the user (both are the "real" number; small rounding
   * drift is expected). */
  liveCradyScore: number;
};

const DEFAULTS = { dividendStability: 35, recovery: 45, trend: 45, momentum: 45, quality: 35 } as const;

const RISK_PENALTY: Record<string, number> = { SAFE: 0, NORMAL: 4, RISKY: 9, EXTREME: 16 };
const RISK_PENALTY_OTHER = 12;

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function qualityFromMagnitude(v: number | null): { value: number; usedDefault: boolean } {
  if (v == null) return { value: DEFAULTS.quality, usedDefault: true };
  return { value: clamp(100 - Math.abs(v)), usedDefault: false };
}

/** Returns null only when the live crady_score itself is unavailable —
 * every sub-component individually degrades to the pipeline's documented
 * default rather than making the whole breakdown unavailable. */
export function computeScoreBreakdown(input: RiskInput): ScoreBreakdown | null {
  if (input.cradyScore == null) return null;

  const dividendStability = input.dividendStabilityScore ?? DEFAULTS.dividendStability;
  const recovery = input.recoveryScore ?? DEFAULTS.recovery;
  const trend = input.trendScore ?? DEFAULTS.trend;
  const momentum = input.momentumScore ?? DEFAULTS.momentum;
  const drawdownQuality = qualityFromMagnitude(input.maxDrawdown);
  const volatilityQuality = qualityFromMagnitude(input.volatility30d);

  const components: ScoreComponent[] = [
    { key: "dividendStability", rawValue: dividendStability, weightPct: 35, points: dividendStability * 0.35, usedDefault: input.dividendStabilityScore == null },
    { key: "recovery", rawValue: recovery, weightPct: 18, points: recovery * 0.18, usedDefault: input.recoveryScore == null },
    { key: "drawdownQuality", rawValue: drawdownQuality.value, weightPct: 17, points: drawdownQuality.value * 0.17, usedDefault: drawdownQuality.usedDefault },
    { key: "volatilityQuality", rawValue: volatilityQuality.value, weightPct: 12, points: volatilityQuality.value * 0.12, usedDefault: volatilityQuality.usedDefault },
    { key: "trend", rawValue: trend, weightPct: 10, points: trend * 0.1, usedDefault: input.trendScore == null },
    { key: "momentum", rawValue: momentum, weightPct: 8, points: momentum * 0.08, usedDefault: input.momentumScore == null },
  ];

  const riskPenaltyPoints = input.riskLevel != null ? (RISK_PENALTY[input.riskLevel] ?? RISK_PENALTY_OTHER) : RISK_PENALTY_OTHER;
  const total = clamp(Math.round((components.reduce((sum, c) => sum + c.points, 0) - riskPenaltyPoints) * 100) / 100);

  return {
    components,
    riskPenalty: { points: riskPenaltyPoints, riskLevel: input.riskLevel },
    total,
    liveCradyScore: input.cradyScore,
  };
}

const COMPONENT_LABEL: Record<ScoreComponent["key"], { en: string; ko: string }> = {
  dividendStability: { en: "Dividend Stability", ko: "배당 안정성" },
  recovery: { en: "Recovery", ko: "회복력" },
  drawdownQuality: { en: "Drawdown", ko: "낙폭" },
  volatilityQuality: { en: "Volatility", ko: "변동성" },
  trend: { en: "Price Trend", ko: "가격 추세" },
  momentum: { en: "Momentum", ko: "모멘텀" },
};

export function componentLabel(key: ScoreComponent["key"], lang: "en" | "ko" = "en"): string {
  return COMPONENT_LABEL[key][lang];
}

/** Top contributing and detracting real factors, as plain sentences — the
 * two components with the most and least points, plus the risk penalty
 * when it's non-zero. Never invents a factor beyond what's in `breakdown`. */
export function buildScoreNarrative(breakdown: ScoreBreakdown, lang: "en" | "ko" = "en"): string[] {
  const sorted = [...breakdown.components].sort((a, b) => b.points - a.points);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const out: string[] = [];

  out.push(
    lang === "ko"
      ? `${componentLabel(strongest.key, "ko")}이(가) 가장 크게 기여했습니다: ${strongest.rawValue.toFixed(1)}/100 → +${strongest.points.toFixed(1)}점 (가중치 ${strongest.weightPct}%).`
      : `${componentLabel(strongest.key, "en")} contributed the most: ${strongest.rawValue.toFixed(1)}/100 → +${strongest.points.toFixed(1)} pts (${strongest.weightPct}% weight).`
  );
  out.push(
    lang === "ko"
      ? `${componentLabel(weakest.key, "ko")}이(가) 가장 적게 기여했습니다: ${weakest.rawValue.toFixed(1)}/100 → +${weakest.points.toFixed(1)}점.`
      : `${componentLabel(weakest.key, "en")} contributed the least: ${weakest.rawValue.toFixed(1)}/100 → +${weakest.points.toFixed(1)} pts.`
  );
  if (breakdown.riskPenalty.points > 0) {
    out.push(
      lang === "ko"
        ? `위험 등급(${breakdown.riskPenalty.riskLevel ?? "—"})으로 인해 ${breakdown.riskPenalty.points}점이 차감되었습니다.`
        : `A ${breakdown.riskPenalty.riskLevel ?? "—"} risk classification subtracted ${breakdown.riskPenalty.points} pts.`
    );
  }
  return out;
}

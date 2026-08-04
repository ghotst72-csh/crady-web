/** CRADY Engagement & Intelligence Phase 2, Part B §18 — Portfolio Health
 * Score. An explicit, documented point allocation (never a single "total
 * return decides everything" number) — see HEALTH_SCORE_WEIGHTS below and
 * the Methodology page. Every sub-score is computed from real portfolio
 * data; when a required input is missing across the whole portfolio, that
 * component is marked unavailable and excluded from the denominator
 * (never silently scored as if it were fine — §18's explicit rule). */

export const HEALTH_SCORE_WEIGHTS = {
  totalReturn: 20,
  drawdownControl: 15,
  incomeStrength: 10,
  incomeStability: 15,
  diversification: 15,
  providerConcentration: 10,
  underlyingConcentration: 5,
  dataQuality: 10,
} as const;

export type HealthScoreComponentKey = keyof typeof HEALTH_SCORE_WEIGHTS;

export type HealthScoreComponent = {
  key: HealthScoreComponentKey;
  /** Points earned, 0..weight. Null when this component couldn't be
   * computed at all (excluded from the total, not scored as 0). */
  score: number | null;
  weight: number;
};

export type HealthScoreResult = {
  components: HealthScoreComponent[];
  /** 0-100, rescaled to only the components that were actually
   * computable — a portfolio missing one input isn't unfairly punished
   * with a phantom zero, but the gap is visible via `availableWeight`. */
  overall: number;
  availableWeight: number;
  totalWeight: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Maps a percentage return onto a 0..weight point scale. 0% return sits
 * at the midpoint (a flat result is neither rewarded nor punished); +50%
 * or better earns full points, -50% or worse earns zero. Linear between. */
function scoreFromPct(pct: number, weight: number, worstPct: number, bestPct: number): number {
  const t = clamp((pct - worstPct) / (bestPct - worstPct), 0, 1);
  return t * weight;
}

export type HealthScoreInput = {
  totalReturnPct: number | null;
  maxDrawdownPct: number | null; // negative or 0
  /** Money-weighted average current annualized yield across holdings. */
  avgCurrentYieldPct: number | null;
  /** Money-weighted average dividend-stability score (0-100) across
   * holdings, from etf_risk_metrics.dividend_stability_score. */
  avgDividendStabilityScore: number | null;
  diversificationScore: number | null; // 0-100, from concentration.ts
  topProviderPct: number | null; // 0-100
  topUnderlyingPct: number | null; // 0-100
  /** Fraction (0-1) of holdings with complete real data (price, risk
   * metrics, distribution history) — not a stand-in for anything else. */
  dataCompletenessFraction: number | null;
};

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const w = HEALTH_SCORE_WEIGHTS;
  const components: HealthScoreComponent[] = [
    {
      key: "totalReturn",
      weight: w.totalReturn,
      score: input.totalReturnPct != null ? scoreFromPct(input.totalReturnPct, w.totalReturn, -50, 50) : null,
    },
    {
      key: "drawdownControl",
      weight: w.drawdownControl,
      // maxDrawdownPct is <= 0; 0% drawdown = full points, -60% or worse = 0.
      score: input.maxDrawdownPct != null ? scoreFromPct(input.maxDrawdownPct, w.drawdownControl, -60, 0) : null,
    },
    {
      key: "incomeStrength",
      weight: w.incomeStrength,
      // A 0-40% annualized-yield band covers this product category's real
      // range; higher isn't infinitely "better" so this deliberately caps
      // rather than rewarding an outlier yield as if it were free.
      score: input.avgCurrentYieldPct != null ? scoreFromPct(input.avgCurrentYieldPct, w.incomeStrength, 0, 40) : null,
    },
    {
      key: "incomeStability",
      weight: w.incomeStability,
      score: input.avgDividendStabilityScore != null ? (clamp(input.avgDividendStabilityScore, 0, 100) / 100) * w.incomeStability : null,
    },
    {
      key: "diversification",
      weight: w.diversification,
      score: input.diversificationScore != null ? (clamp(input.diversificationScore, 0, 100) / 100) * w.diversification : null,
    },
    {
      key: "providerConcentration",
      weight: w.providerConcentration,
      // Lower top-provider share is better; 100% in one provider = 0
      // points, 25% or less (well-spread) = full points.
      score: input.topProviderPct != null ? scoreFromPct(100 - input.topProviderPct, w.providerConcentration, 0, 75) : null,
    },
    {
      key: "underlyingConcentration",
      weight: w.underlyingConcentration,
      score: input.topUnderlyingPct != null ? scoreFromPct(100 - input.topUnderlyingPct, w.underlyingConcentration, 0, 75) : null,
    },
    {
      key: "dataQuality",
      weight: w.dataQuality,
      score: input.dataCompletenessFraction != null ? clamp(input.dataCompletenessFraction, 0, 1) * w.dataQuality : null,
    },
  ];

  const available = components.filter((c) => c.score != null);
  const availableWeight = available.reduce((s, c) => s + c.weight, 0);
  const earned = available.reduce((s, c) => s + (c.score as number), 0);
  const overall = availableWeight > 0 ? (earned / availableWeight) * 100 : 0;

  return {
    components,
    overall,
    availableWeight,
    totalWeight: Object.values(w).reduce((a, b) => a + b, 0),
  };
}

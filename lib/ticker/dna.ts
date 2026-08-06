/** CRADY Intelligence 4.0 — "ETF DNA": five 1–5 star traits from real,
 * already-stored sub-scores. No trait is invented from a formula that
 * doesn't exist — each star rating is a direct, documented mapping from
 * one real column. A trait is `null` (rendered as "—", never a fabricated
 * middle value) when its source column is null for this ticker.
 *
 * "Diversification" from the original spec has no real per-fund
 * equivalent in this data model (diversification is only ever computed
 * at the portfolio level — see lib/portfolio/concentration.ts, which
 * needs multiple holdings to mean anything). It's replaced here with
 * "Data Confidence": how many of this DNA's own real inputs are actually
 * populated for this ticker — itself a real, useful, non-fabricated
 * signal (about 1 in 3 tracked tickers has the fuller sub-score set;
 * this trait tells the reader which kind they're looking at). */

export type DnaInput = {
  incomeScore: number | null;
  momentumScore: number | null;
  riskLevel: string | null;
  recoveryScore: number | null;
  dividendStabilityScore: number | null;
  safetyScore: number | null;
  trendScore: number | null;
};

export type DnaTraitKey = "income" | "growth" | "risk" | "recovery" | "stability" | "dataConfidence";

export type DnaTraits = Partial<Record<DnaTraitKey, number>>;

function starsFromScore(score: number | null): number | null {
  if (score == null) return null;
  return Math.min(5, Math.max(1, Math.round(score / 20)));
}

const RISK_LEVEL_STARS: Record<string, number> = { SAFE: 1, NORMAL: 2, RISKY: 4, EXTREME: 5 };

export function buildEtfDna(input: DnaInput): DnaTraits {
  const traits: DnaTraits = {};

  const income = starsFromScore(input.incomeScore);
  if (income != null) traits.income = income;

  // 0 is a real data point (flat/negative momentum), not "missing" — only
  // null is missing.
  const growth = input.momentumScore != null ? starsFromScore(Math.max(0, input.momentumScore)) ?? 1 : null;
  if (growth != null) traits.growth = growth;

  if (input.riskLevel && RISK_LEVEL_STARS[input.riskLevel] != null) {
    traits.risk = RISK_LEVEL_STARS[input.riskLevel];
  }

  const recovery = input.recoveryScore != null ? starsFromScore(input.recoveryScore) ?? 1 : null;
  if (recovery != null) traits.recovery = recovery;

  const stability = starsFromScore(input.dividendStabilityScore);
  if (stability != null) traits.stability = stability;

  const confidenceInputs = [input.incomeScore, input.safetyScore, input.momentumScore, input.recoveryScore, input.trendScore];
  const populatedCount = confidenceInputs.filter((v) => v != null).length;
  traits.dataConfidence = Math.max(1, Math.round((populatedCount / confidenceInputs.length) * 5));

  return traits;
}

const TRAIT_LABEL: Record<DnaTraitKey, { en: string; ko: string }> = {
  income: { en: "Income", ko: "인컴" },
  growth: { en: "Growth", ko: "성장성" },
  risk: { en: "Risk", ko: "위험도" },
  recovery: { en: "Recovery", ko: "회복력" },
  stability: { en: "Stability", ko: "안정성" },
  dataConfidence: { en: "Data Confidence", ko: "데이터 신뢰도" },
};

export function dnaTraitLabel(key: DnaTraitKey, lang: "en" | "ko" = "en"): string {
  return TRAIT_LABEL[key][lang];
}

export const DNA_TRAIT_ORDER: DnaTraitKey[] = ["income", "growth", "risk", "recovery", "stability", "dataConfidence"];

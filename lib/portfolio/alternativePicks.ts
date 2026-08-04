import type { EtfSnapshot } from "@/lib/data";
import type { AlternativeCategory } from "./types";

/** CRADY Portfolio Analyzer Phase 1 — "same date, alternative ETF" picks.
 *
 * IMPORTANT DATA CONSTRAINT: the CRADY pipeline tracks 72 ETFs across
 * exactly three providers — YieldMax, Roundhill, Defiance (all
 * covered-call/high-income products). SCHD, QQQ, JEPI, and JEPQ have ZERO
 * rows in etf_price_history — confirmed by direct query before writing
 * this module. Per this feature's own spec (§13: "don't force-compare an
 * ETF without enough data"), those four are not offered as alternatives in
 * Phase 1; every pick here comes from the site's own real, tracked
 * universe. A user CAN still add one of those tickers as a *holding* — it
 * will honestly show "no price data available" (the same pattern already
 * shipped for MDTE on the ETF Hero), not a fabricated comparison. */

export type AlternativePick = {
  ticker: string;
  category: AlternativeCategory;
  reason: string;
};

const T = {
  sameProvider: {
    en: (ticker: string, provider: string) => `${ticker} is ${provider}'s top-scoring alternative by CRADY Score.`,
    ko: (ticker: string, provider: string) => `${ticker}는 CRADY 점수 기준 ${provider}의 대표 대안 상품입니다.`,
  },
  similarIncome: {
    en: (ticker: string) => `${ticker} follows a similar income strategy with a comparable distribution yield.`,
    ko: (ticker: string) => `${ticker}는 유사한 인컴 전략을 사용하며 분배율 수준이 비슷합니다.`,
  },
  lowerRiskIncome: {
    en: (ticker: string) => `${ticker} is shown as a lower-risk income alternative over the same holding period.`,
    ko: (ticker: string) => `${ticker}는 동일 보유 기간 기준 더 낮은 위험도의 인컴 대안으로 제시됩니다.`,
  },
  betterIncomeStability: {
    en: (ticker: string) => `${ticker} has shown more stable dividend payments historically.`,
    ko: (ticker: string) => `${ticker}는 과거 배당 지급이 더 안정적이었습니다.`,
  },
  betterRiskAdjusted: {
    en: (ticker: string) => `${ticker} has delivered better risk-adjusted performance (yield per unit of volatility).`,
    ko: (ticker: string) => `${ticker}는 변동성 대비 분배율(위험조정 성과)이 더 우수합니다.`,
  },
} as const;

const RISK_RANK: Record<string, number> = { SAFE: 0, NORMAL: 1, RISKY: 2, EXTREME: 3 };

function efficiency(s: EtfSnapshot): number | null {
  if (s.annualYieldPct == null || s.volatility30d == null || s.volatility30d <= 0) return null;
  return s.annualYieldPct / s.volatility30d;
}

/** Picks up to one candidate per category, in the fixed priority order
 * same-provider -> similar-income -> lower-risk-income ->
 * better-income-stability -> better-risk-adjusted, skipping any category
 * with no real qualifying candidate and never repeating a ticker across
 * categories. `providerLabel` is injected rather than imported to keep
 * this module free of any component/formatting dependency. */
export function pickAlternatives(
  ticker: string,
  snapshot: EtfSnapshot[],
  providerLabelFn: (providerId: string) => string,
  lang: "en" | "ko" = "en"
): AlternativePick[] {
  const target = snapshot.find((s) => s.ticker === ticker);
  if (!target) return [];

  const used = new Set<string>([ticker]);
  const picks: AlternativePick[] = [];
  const candidates = () => snapshot.filter((s) => !used.has(s.ticker));

  // 1. Same provider — best CRADY Score among the target's own family.
  const sameProviderCandidates = candidates()
    .filter((s) => s.provider_id === target.provider_id && s.cradyScore != null)
    .sort((a, b) => (b.cradyScore ?? 0) - (a.cradyScore ?? 0));
  if (sameProviderCandidates.length > 0) {
    const pick = sameProviderCandidates[0];
    used.add(pick.ticker);
    picks.push({
      ticker: pick.ticker,
      category: "same-provider",
      reason: T.sameProvider[lang](pick.ticker, providerLabelFn(pick.provider_id)),
    });
  }

  // 2. Similar income strategy — closest annualized yield, same payout
  // frequency when known, excluding anything already picked.
  if (target.annualYieldPct != null) {
    const sameFreq = candidates().filter(
      (s) =>
        s.annualYieldPct != null &&
        (target.payoutFrequency == null || s.payoutFrequency === target.payoutFrequency)
    );
    const pool = sameFreq.length > 0 ? sameFreq : candidates().filter((s) => s.annualYieldPct != null);
    const sorted = pool.sort(
      (a, b) => Math.abs((a.annualYieldPct ?? 0) - target.annualYieldPct!) - Math.abs((b.annualYieldPct ?? 0) - target.annualYieldPct!)
    );
    if (sorted.length > 0) {
      const pick = sorted[0];
      used.add(pick.ticker);
      picks.push({ ticker: pick.ticker, category: "similar-income", reason: T.similarIncome[lang](pick.ticker) });
    }
  }

  // 3. Lower-risk income alternative — a genuinely better risk bucket
  // (never just "the closest one"), still a real income product, best
  // CRADY Score among qualifiers.
  const targetRiskRank = target.riskLevel ? RISK_RANK[target.riskLevel] : null;
  if (targetRiskRank != null) {
    const lowerRisk = candidates()
      .filter((s) => s.riskLevel != null && RISK_RANK[s.riskLevel] < targetRiskRank && s.annualYieldPct != null)
      .sort((a, b) => (b.cradyScore ?? 0) - (a.cradyScore ?? 0));
    if (lowerRisk.length > 0) {
      const pick = lowerRisk[0];
      used.add(pick.ticker);
      picks.push({ ticker: pick.ticker, category: "lower-risk-income", reason: T.lowerRiskIncome[lang](pick.ticker) });
    }
  }

  // 4. Better income stability — strictly higher dividendStabilityScore.
  if (target.dividendStabilityScore != null) {
    const moreStable = candidates()
      .filter((s) => s.dividendStabilityScore != null && s.dividendStabilityScore > target.dividendStabilityScore!)
      .sort((a, b) => (b.dividendStabilityScore ?? 0) - (a.dividendStabilityScore ?? 0));
    if (moreStable.length > 0) {
      const pick = moreStable[0];
      used.add(pick.ticker);
      picks.push({ ticker: pick.ticker, category: "better-income-stability", reason: T.betterIncomeStability[lang](pick.ticker) });
    }
  }

  // 5. Better risk-adjusted performance — strictly higher yield-per-
  // volatility efficiency than the target's own.
  const targetEfficiency = efficiency(target);
  if (targetEfficiency != null) {
    const betterEfficiency = candidates()
      .map((s) => ({ s, eff: efficiency(s) }))
      .filter((x): x is { s: EtfSnapshot; eff: number } => x.eff != null && x.eff > targetEfficiency!)
      .sort((a, b) => b.eff - a.eff);
    if (betterEfficiency.length > 0) {
      const pick = betterEfficiency[0].s;
      used.add(pick.ticker);
      picks.push({ ticker: pick.ticker, category: "better-risk-adjusted", reason: T.betterRiskAdjusted[lang](pick.ticker) });
    }
  }

  return picks;
}

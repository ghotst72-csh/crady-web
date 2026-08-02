import { providerLabel } from "@/lib/providers";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "low", NORMAL: "moderate", RISKY: "elevated", EXTREME: "very high" },
  ko: { SAFE: "낮은", NORMAL: "보통", RISKY: "높은", EXTREME: "매우 높은" },
};

export type EnrichmentInput = {
  ticker: string;
  providerId: string;
  investmentStrategy: string | null;
  annualYieldPct: number | null;
  payoutFrequency: string | null;
  riskLevel: string | null;
  maxDrawdownPct: number | null;
  volatility90dPct: number | null;
  dividendStabilityScore: number | null;
  trend12mo: { avgChangePct: number | null; increases: number; decreases: number; count: number } | null;
};

function fmtPct(n: number | null | undefined): string {
  return n != null ? `${n.toFixed(1)}%` : "—";
}

/** "Why investors buy this ETF" — templated from whatever real strategy
 * text/yield/trend data exists; never invents a reason that isn't backed
 * by a fetched number. Falls back to the bare yield/frequency fact when no
 * strategy text exists for this ETF (etf.investment_strategy/
 * long_description are both nullable in the source data). */
export function buildWhyInvestorsBuy(input: EnrichmentInput, lang: "en" | "ko" = "en"): string {
  const { ticker, providerId, investmentStrategy, annualYieldPct, payoutFrequency, trend12mo } = input;
  const provider = providerLabel(providerId);

  if (lang === "ko") {
    const parts: string[] = [];
    if (investmentStrategy) {
      parts.push(investmentStrategy);
    } else {
      parts.push(
        `${ticker}는 ${provider}가 발행하는${payoutFrequency ? ` ${payoutFrequency}` : ""} 배당 ETF로, 현재 소득 창출을 목표로 합니다.`
      );
    }
    if (annualYieldPct != null) {
      parts.push(`최근 90일 실지급 기준 연환산 분배율은 ${fmtPct(annualYieldPct)}입니다.`);
    }
    if (trend12mo && trend12mo.count > 0 && trend12mo.avgChangePct != null && trend12mo.avgChangePct >= 0) {
      parts.push(`지난 12개월간 배당 지급 추세도 대체로 안정적이거나 상승세를 보였습니다.`);
    }
    return parts.join(" ");
  }

  const parts: string[] = [];
  if (investmentStrategy) {
    parts.push(investmentStrategy);
  } else {
    parts.push(
      `${ticker} is a${payoutFrequency ? ` ${payoutFrequency}` : ""} dividend ETF from ${provider}, aimed at generating current income.`
    );
  }
  if (annualYieldPct != null) {
    parts.push(`Its trailing-90-day run-rate annualized yield is ${fmtPct(annualYieldPct)}.`);
  }
  if (trend12mo && trend12mo.count > 0 && trend12mo.avgChangePct != null && trend12mo.avgChangePct >= 0) {
    parts.push("Its dividend trend over the past 12 months has generally held steady or increased.");
  }
  return parts.join(" ");
}

/** "Biggest risks" — surfaces the real, previously-unused etf.risk_summary
 * field plus computed risk metrics. Returns null (section omitted) rather
 * than fabricated text when neither exists. */
export function buildBiggestRisks(
  input: EnrichmentInput,
  riskSummary: string | null,
  lang: "en" | "ko" = "en"
): string | null {
  const { ticker, maxDrawdownPct, volatility90dPct, riskLevel } = input;
  if (!riskSummary && maxDrawdownPct == null && volatility90dPct == null) return null;

  if (lang === "ko") {
    const parts: string[] = [];
    if (riskSummary) parts.push(riskSummary);
    if (maxDrawdownPct != null) {
      parts.push(`과거 최대 낙폭은 ${fmtPct(maxDrawdownPct)}로 기록되었습니다.`);
    }
    if (volatility90dPct != null) {
      parts.push(`최근 90일 변동성은 ${fmtPct(volatility90dPct)}입니다.`);
    }
    if (riskLevel) {
      parts.push(`${ticker}의 현재 위험도는 ${RISK_LABEL.ko[riskLevel] ?? riskLevel} 등급으로 분류됩니다.`);
    }
    return parts.join(" ");
  }

  const parts: string[] = [];
  if (riskSummary) parts.push(riskSummary);
  if (maxDrawdownPct != null) {
    parts.push(`Its historical maximum drawdown is ${fmtPct(maxDrawdownPct)}.`);
  }
  if (volatility90dPct != null) {
    parts.push(`90-day volatility is ${fmtPct(volatility90dPct)}.`);
  }
  if (riskLevel) {
    parts.push(`${ticker} is currently classified as ${(RISK_LABEL.en[riskLevel] ?? riskLevel).toLowerCase()} risk.`);
  }
  return parts.join(" ");
}

/** "Who should avoid it" — a plain inference from the same risk
 * classification already shown elsewhere on the page, not a separate
 * judgment call. Returns null when risk is unknown. */
export function buildWhoShouldAvoid(input: EnrichmentInput, lang: "en" | "ko" = "en"): string | null {
  const { riskLevel, dividendStabilityScore } = input;
  if (!riskLevel) return null;

  const highRisk = riskLevel === "RISKY" || riskLevel === "EXTREME";
  const unstableDividend = dividendStabilityScore != null && dividendStabilityScore < 50;

  if (lang === "ko") {
    if (highRisk) {
      return "원금 안정성과 예측 가능한 현금흐름을 최우선으로 하는 보수적인 투자자에게는 적합하지 않을 수 있습니다.";
    }
    if (unstableDividend) {
      return "배당금이 매 회차 일정하게 유지되기를 기대하는 투자자에게는 변동성이 부담이 될 수 있습니다.";
    }
    return "고배당 커버드콜 ETF 특유의 변동성과 원금 손실 가능성을 감내할 수 없는 투자자에게는 적합하지 않을 수 있습니다.";
  }

  if (highRisk) {
    return "Conservative investors who prioritize capital stability and predictable cash flow over high current income may find this ETF's volatility and risk profile unsuitable.";
  }
  if (unstableDividend) {
    return "Investors who need a highly consistent, unchanging per-payment dividend amount may find this fund's payment variability a drawback.";
  }
  return "Investors who can't tolerate the volatility and principal-loss risk inherent to high-yield covered-call ETFs generally may find this fund unsuitable.";
}

/** "Historical characteristics" — a prose summary of the same trend12mo
 * numbers already computed elsewhere on the page (lib/magazine/trend.ts's
 * computeDividendTrend), reused here rather than recomputed. */
export function buildHistoricalCharacteristics(input: EnrichmentInput, lang: "en" | "ko" = "en"): string | null {
  const { ticker, trend12mo } = input;
  if (!trend12mo || trend12mo.count === 0) return null;

  if (lang === "ko") {
    return `지난 12개월간 ${ticker}는 총 ${trend12mo.count}회 배당을 지급했으며, 그중 ${trend12mo.increases}회는 증가, ${trend12mo.decreases}회는 감소했습니다${
      trend12mo.avgChangePct != null ? ` (회차별 평균 변동률 ${fmtPct(trend12mo.avgChangePct)})` : ""
    }.`;
  }
  return `Over the past 12 months, ${ticker} made ${trend12mo.count} distribution${trend12mo.count === 1 ? "" : "s"}, with ${trend12mo.increases} increase${trend12mo.increases === 1 ? "" : "s"} and ${trend12mo.decreases} decrease${trend12mo.decreases === 1 ? "" : "s"}${
    trend12mo.avgChangePct != null ? ` (average payment-over-payment change of ${fmtPct(trend12mo.avgChangePct)})` : ""
  }.`;
}

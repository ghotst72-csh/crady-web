/** CRADY Intelligence 4.0 — Risk classification context.
 *
 * IMPORTANT, and the reason this file exists instead of a "why is risk
 * High" causal explainer: `risk_level` (SAFE/NORMAL/RISKY/EXTREME) has NO
 * discoverable formula anywhere in the separate Python pipeline repo. At
 * least 10 tickers have it as a literal hand-seeded SQL value with a
 * human-judgment comment; the origin for the rest (including every
 * YieldMax ticker) could not be found. Claiming a causal "why" for this
 * field would be exactly the kind of fabrication the spec forbids.
 *
 * So this builds an honest *association*, not a *cause*: the real metrics
 * that correlate with risk in this data model (volatility, drawdown,
 * dividend stability), clearly labeled as context, with an explicit
 * disclaimer. The risk_level badge itself is never altered or recomputed
 * here — this is confirmed with the user as the intended treatment. */

export type RiskContextInput = {
  riskLevel: string | null;
  volatility30d: number | null;
  volatility90d: number | null;
  maxDrawdown: number | null;
  dividendStabilityScore: number | null;
};

export type RiskContextItem = {
  key: "volatility30d" | "volatility90d" | "maxDrawdown" | "dividendStability";
  value: number;
};

export type RiskContext = {
  riskLevel: string;
  items: RiskContextItem[];
};

/** Returns null when risk_level itself is missing — there's nothing to
 * give context for. Individual metrics are included only when real
 * (never a fabricated fallback). */
export function buildRiskContext(input: RiskContextInput): RiskContext | null {
  if (!input.riskLevel) return null;
  const items: RiskContextItem[] = [];
  if (input.volatility30d != null) items.push({ key: "volatility30d", value: input.volatility30d });
  if (input.volatility90d != null) items.push({ key: "volatility90d", value: input.volatility90d });
  if (input.maxDrawdown != null) items.push({ key: "maxDrawdown", value: input.maxDrawdown });
  if (input.dividendStabilityScore != null) items.push({ key: "dividendStability", value: input.dividendStabilityScore });
  return { riskLevel: input.riskLevel, items };
}

const ITEM_LABEL: Record<RiskContextItem["key"], { en: string; ko: string }> = {
  volatility30d: { en: "30-Day Volatility", ko: "30일 변동성" },
  volatility90d: { en: "90-Day Volatility", ko: "90일 변동성" },
  maxDrawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
  dividendStability: { en: "Dividend Stability", ko: "배당 안정성" },
};

export function riskItemLabel(key: RiskContextItem["key"], lang: "en" | "ko" = "en"): string {
  return ITEM_LABEL[key][lang];
}

export function formatRiskItemValue(item: RiskContextItem): string {
  if (item.key === "dividendStability") return `${item.value.toFixed(1)}/100`;
  return `${item.value.toFixed(1)}%`;
}

export const RISK_DISCLAIMER = {
  en: "Risk level is a category label from CRADY's data pipeline. The metrics below are real data associated with this ETF, not a documented formula that produced the label — that exact assignment logic isn't available in this data source.",
  ko: "위험 등급은 CRADY 데이터 파이프라인이 제공하는 분류 라벨입니다. 아래 지표는 이 ETF와 연관된 실제 데이터이며, 라벨을 산출한 공식 자체는 아닙니다 — 정확한 산출 로직은 이 데이터 소스에서 확인할 수 없습니다.",
} as const;

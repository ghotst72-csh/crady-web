import type { RiskMetricsRow, EtfSnapshot } from "@/lib/data";

/** A risk-analysis page whose ticker has none of these is nothing but FAQ
 * boilerplate ("data isn't available yet" x3) — genuinely thin, not just a
 * data gap. Found via scripts/audit-magazine-uniqueness.mjs (MDTE: 44-word
 * body, 35% overlap with its own dividend-guide page). Two variants because
 * the DB row (ArticleData.risk, used by generateMetadata) and the bulk
 * snapshot (EtfSnapshot, used by sitemap.ts) use different field names for
 * the same three columns. */
export function hasRiskContent(risk: RiskMetricsRow | null): boolean {
  if (!risk) return false;
  return risk.crady_score != null || risk.risk_level != null || risk.dividend_stability_score != null;
}

export function hasRiskContentFromSnapshot(e: EtfSnapshot): boolean {
  return e.cradyScore != null || e.riskLevel != null || e.dividendStabilityScore != null;
}

/** A dividend-calendar page for a ticker with no published future schedule
 * renders as FAQ-only boilerplate — same thin-content shape as the
 * risk-analysis case above, gated the same way (generateMetadata +
 * sitemap.ts both call this so they can never disagree). */
export function hasFutureSchedule(futureSchedule: { pay_date: string }[]): boolean {
  return futureSchedule.length > 0;
}

/** dividend-guide and dividend-history both collapse to near-identical FAQ
 * boilerplate for a ticker with zero recorded paid distributions and no
 * strategy text (found via the expanded uniqueness audit: MDTE's guide and
 * history pages hit 38.7% overlap — both pages had nothing to say beyond
 * "no data yet" in slightly different words). A ticker with real
 * distribution history OR real investment-strategy copy has enough
 * genuinely different material for both pages to stay distinct; one with
 * neither doesn't, regardless of word count. */
export function hasDistributionOrStrategyContent(data: {
  distributions: { amount: number | null }[];
  etf: { investment_strategy: string | null; long_description: string | null };
}): boolean {
  return (
    data.distributions.some((d) => d.amount != null) ||
    !!data.etf.investment_strategy ||
    !!data.etf.long_description
  );
}

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

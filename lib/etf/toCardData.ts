import type { EtfSnapshot } from "@/lib/data";
import type { EtfCardData } from "@/components/etf/EtfCard";

/** Maps the sitewide EtfSnapshot (Home/Ranking/Compare's existing,
 * unmodified data source) to the shared Premium Card's data shape. Purely
 * a field-rename/passthrough — no new calculation, and no field is
 * invented for a slot EtfSnapshot doesn't carry (today's %, sub-scores,
 * underlying ticker, etf type all render as "—"/omitted, matching this
 * component's established honest-empty pattern). */
export function snapshotToCardData(etf: EtfSnapshot): EtfCardData {
  return {
    ticker: etf.ticker,
    name: etf.name,
    providerId: etf.provider_id,
    etfType: null,
    currentPrice: etf.price,
    todayChangePct: null,
    annualYieldPct: etf.annualYieldPct,
    cradyScore: etf.cradyScore,
    incomeScore: null,
    stabilityScore: etf.dividendStabilityScore,
    riskDefenseScore: null,
    growthScore: null,
    payoutFrequency: etf.payoutFrequency,
    riskLevel: etf.riskLevel,
    asOfDate: etf.calculatedAt ? etf.calculatedAt.slice(0, 10) : null,
    nextExDate: etf.nextPredictedExDate,
    expectedDistribution: etf.nextPredictedAmount,
  };
}

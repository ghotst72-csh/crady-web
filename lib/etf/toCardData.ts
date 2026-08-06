import type { EtfSnapshot, ComparisonPeer } from "@/lib/data";
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

/** Same mapping for a single-ticker ComparisonPeer fetch (Compare page,
 * ticker-page "Similar ETFs") — the two data sources that carry the same
 * card-relevant fields but aren't EtfSnapshot rows. */
export function comparisonPeerToCardData(p: ComparisonPeer): EtfCardData {
  return {
    ticker: p.ticker,
    name: p.name,
    providerId: p.provider_id,
    etfType: p.etfType,
    underlyingTicker: p.underlyingTicker,
    currentPrice: p.currentPrice,
    todayChangePct: null,
    annualYieldPct: p.annualYieldPct,
    cradyScore: p.cradyScore,
    incomeScore: p.incomeScore,
    stabilityScore: p.dividendStabilityScore,
    payoutFrequency: p.payoutFrequency,
    riskLevel: p.riskLevel,
    asOfDate: null,
  };
}

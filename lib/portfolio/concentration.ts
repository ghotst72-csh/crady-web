/** CRADY Engagement & Intelligence Phase 2, Part B §17 — concentration
 * analysis. Pure functions; every grouping key traces to a real field
 * (provider_id, underlying_ticker, a classified strategy type). */

export type ConcentrationHolding = {
  ticker: string;
  investmentAmount: number;
  providerLabel: string;
  /** Real underlying_ticker when known (e.g. "TSLA") — holdings sharing
   * the same underlying are summed together even if their own tickers
   * differ, per the spec's explicit instruction. Falls back to the
   * holding's own ticker when there's no single underlying (index/broad
   * products), so it still forms its own distinct group rather than being
   * silently dropped from this breakdown. */
  underlyingLabel: string;
  strategyLabel: string;
  payoutFrequency: string | null;
};

export type ConcentrationEntry = { label: string; amount: number; pct: number };

export type ConcentrationAnalysis = {
  byProvider: ConcentrationEntry[];
  byUnderlying: ConcentrationEntry[];
  byStrategy: ConcentrationEntry[];
  byFrequency: ConcentrationEntry[];
  topHolding: { ticker: string; pct: number } | null;
};

function groupBy(holdings: ConcentrationHolding[], keyFn: (h: ConcentrationHolding) => string, total: number): ConcentrationEntry[] {
  const sums = new Map<string, number>();
  for (const h of holdings) {
    sums.set(keyFn(h), (sums.get(keyFn(h)) ?? 0) + h.investmentAmount);
  }
  return [...sums.entries()]
    .map(([label, amount]) => ({ label, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function computeConcentration(holdings: ConcentrationHolding[]): ConcentrationAnalysis | null {
  const total = holdings.reduce((s, h) => s + h.investmentAmount, 0);
  if (holdings.length === 0 || total <= 0) return null;

  const topHoldingRaw = [...holdings].sort((a, b) => b.investmentAmount - a.investmentAmount)[0];

  return {
    byProvider: groupBy(holdings, (h) => h.providerLabel, total),
    byUnderlying: groupBy(holdings, (h) => h.underlyingLabel, total),
    byStrategy: groupBy(holdings, (h) => h.strategyLabel, total),
    byFrequency: groupBy(holdings, (h) => h.payoutFrequency ?? "Unknown", total),
    topHolding: { ticker: topHoldingRaw.ticker, pct: (topHoldingRaw.investmentAmount / total) * 100 },
  };
}

/** Herfindahl-Hirschman-style diversification score, 0-100 (100 = perfectly
 * even across many holdings, 0 = a single holding). Uses the *underlying*
 * grouping (not raw ticker), so two tickers on the same stock don't count
 * as diversification. Real, standard concentration-index math — not an
 * invented metric. */
export function computeDiversificationScore(byUnderlying: ConcentrationEntry[]): number {
  if (byUnderlying.length === 0) return 0;
  const hhi = byUnderlying.reduce((sum, e) => sum + (e.pct / 100) ** 2, 0); // 1/n (even) .. 1 (concentrated)
  const n = byUnderlying.length;
  const minHhi = 1 / n; // best possible HHI for this holding count
  // Normalize so n=1 -> 0, and an even split at the actual holding count -> 100.
  if (n <= 1) return 0;
  const normalized = 1 - (hhi - minHhi) / (1 - minHhi);
  return Math.max(0, Math.min(100, normalized * 100));
}

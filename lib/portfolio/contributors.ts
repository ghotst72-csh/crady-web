/** CRADY Engagement & Intelligence Phase 2, Part B §16 — per-holding
 * profit/loss contribution, price vs. dividend split. Pure reshaping of
 * numbers already computed by lib/portfolio/analyze.ts — no new
 * calculation, just sorted for display. */

export type ContributorInput = {
  ticker: string;
  priceReturnAmount: number | null;
  totalDividendsReceived: number;
  totalReturnAmount: number | null;
};

export type Contributor = {
  ticker: string;
  priceContribution: number;
  dividendContribution: number;
  netContribution: number;
};

/** Sorted descending by net contribution (best contributor first). Skips
 * a holding entirely if it has no computable total return (e.g. no price
 * data) rather than showing it as a fabricated $0 contributor. */
export function buildContributors(holdings: ContributorInput[]): Contributor[] {
  return holdings
    .filter((h): h is ContributorInput & { totalReturnAmount: number; priceReturnAmount: number } => h.totalReturnAmount != null && h.priceReturnAmount != null)
    .map((h) => ({
      ticker: h.ticker,
      priceContribution: h.priceReturnAmount,
      dividendContribution: h.totalDividendsReceived,
      netContribution: h.totalReturnAmount,
    }))
    .sort((a, b) => b.netContribution - a.netContribution);
}

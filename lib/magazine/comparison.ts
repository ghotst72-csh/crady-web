/** Deterministically picks one comparison partner per ticker: its immediate
 * neighbor in the alphabetically-sorted, same-provider ticker list
 * (wrapping around). A round-robin instead of "always the first ticker in
 * the provider" so a provider's ~20 comparison pages don't all compare
 * against the same single peer — each ticker gets a distinct partner, and
 * pairs are spread across the list rather than fanning out from one node. */
export function pickComparisonPeerTicker(
  ticker: string,
  providerId: string,
  allTickers: { ticker: string; provider_id: string }[]
): string | null {
  const peers = pickComparisonPeerTickers(ticker, providerId, allTickers, 1);
  return peers[0] ?? null;
}

/** Same round-robin idea, extended to up to `n` peers — the next `n`
 * tickers after this one in the sorted, same-provider list (wrapping,
 * de-duplicated, excluding self). Used by the comparison page's multi-peer
 * table and the next-dividend-prediction quick-compare teaser. */
export function pickComparisonPeerTickers(
  ticker: string,
  providerId: string,
  allTickers: { ticker: string; provider_id: string }[],
  n: number
): string[] {
  const sameProvider = allTickers
    .filter((t) => t.provider_id === providerId)
    .map((t) => t.ticker)
    .sort();
  if (sameProvider.length < 2) return [];
  const index = sameProvider.indexOf(ticker);
  if (index === -1) return [];
  const out: string[] = [];
  for (let i = 1; i <= Math.min(n, sameProvider.length - 1); i++) {
    out.push(sameProvider[(index + i) % sameProvider.length]);
  }
  return out;
}

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
  const sameProvider = allTickers
    .filter((t) => t.provider_id === providerId)
    .map((t) => t.ticker)
    .sort();
  if (sameProvider.length < 2) return null;
  const index = sameProvider.indexOf(ticker);
  if (index === -1) return null;
  return sameProvider[(index + 1) % sameProvider.length];
}

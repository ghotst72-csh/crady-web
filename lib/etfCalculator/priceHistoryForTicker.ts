"use server";

import { getPriceHistory } from "@/lib/data";

// Full history, same cap as historicalReturn.ts, so a date resolved here
// (client-side, via the pure resolvePurchasePrice) always agrees with what
// the final "Calculate Return" server action would resolve for the same
// date — one ticker, one fetch, reused for the live purchase/sale price
// preview as the user picks dates, before they click Calculate.
const PRICE_ROWS = 3650;

export async function getPriceHistoryForTicker(rawTicker: string) {
  return getPriceHistory(rawTicker.trim().toUpperCase(), PRICE_ROWS);
}

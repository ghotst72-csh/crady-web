/** CRADY ETF Calculator — historical return engine (pure, no I/O).
 *
 * This is the actual "what would I have earned" calculator — real
 * purchase-date and sale-date prices, real distribution records, real
 * split-anomaly detection. It replaces an earlier forward-looking
 * compounding *projection* tool that shipped under the same route: this
 * file computes nothing from assumptions, only from data the caller
 * supplies (see historicalReturn.ts for where that data comes from —
 * lib/data.ts's real Supabase queries).
 *
 * Deliberately composes lib/portfolio/calculations.ts's existing,
 * independently-tested primitives (resolvePurchasePrice,
 * computeEligibleDividends, computeTotalReturn, detectSplitWarnings,
 * simulateReinvestment) rather than reimplementing purchase-price
 * resolution, dividend eligibility, or split detection — the Portfolio
 * Analyzer and this calculator must never silently disagree about what
 * "eligible" or "a possible split" means. */

import {
  resolvePurchasePrice,
  computeEligibleDividends,
  computeTotalReturn,
  computePriceReturn,
  computeAnnualizedReturnPct,
  detectSplitWarnings,
  simulateReinvestment,
  daysBetween,
  type PriceHistoryPoint,
  type DistributionPoint,
} from "@/lib/portfolio/calculations";

export type DistributionLineItem = {
  exDate: string;
  payDate: string;
  amountPerShare: number;
  shares: number;
  cashReceived: number;
};

export type HistoricalReturnResult =
  | {
      ok: true;
      requestedPurchaseDate: string;
      purchaseDate: string;
      purchaseDateAdjusted: boolean;
      purchasePrice: number;
      requestedSaleDate: string;
      saleDate: string;
      saleDateAdjusted: boolean;
      salePrice: number;
      investmentAmount: number;
      shares: number;
      endingShareValue: number;
      priceGainLoss: number;
      priceReturnPct: number | null;
      distributions: DistributionLineItem[];
      totalDistributionsReceived: number;
      distributionPerShareTotal: number;
      /** Cash mode (DRIP OFF) — distributions paid out, not reinvested. */
      finalValueCash: number;
      profitLossCash: number;
      totalReturnPctCash: number | null;
      annualizedReturnPctCash: number | null;
      /** DRIP mode (DRIP ON) — every eligible distribution buys more shares
       * at that ex-date's price, same mechanics as the Portfolio Analyzer's
       * own reinvestment simulation. Computed unconditionally so the UI
       * toggle is instant with no second round trip. */
      dripFinalShares: number;
      dripFinalValue: number;
      dripProfitLoss: number;
      dripTotalReturnPct: number | null;
      dripAnnualizedReturnPct: number | null;
      holdingDays: number;
    }
  | {
      ok: false;
      reason: "invalid-range" | "not-listed-yet" | "insufficient-data" | "split-anomaly";
      splitWarnings?: { date: string; ratio: number }[];
    };

export function computeHistoricalReturn(
  history: PriceHistoryPoint[],
  distributions: DistributionPoint[],
  purchaseDateIso: string,
  saleDateIso: string,
  investmentAmount: number
): HistoricalReturnResult {
  if (!(investmentAmount > 0) || saleDateIso < purchaseDateIso) {
    return { ok: false, reason: "invalid-range" };
  }

  const purchase = resolvePurchasePrice(history, purchaseDateIso, null);
  if (!purchase) return { ok: false, reason: "not-listed-yet" };

  const sale = resolvePurchasePrice(history, saleDateIso, null);
  if (!sale) return { ok: false, reason: "insufficient-data" };

  const splitWarnings = detectSplitWarnings(history, purchase.effectiveDate, sale.effectiveDate);
  if (splitWarnings.length > 0) {
    return { ok: false, reason: "split-anomaly", splitWarnings };
  }

  const shares = investmentAmount / purchase.effectivePrice;
  const endingShareValue = shares * sale.effectivePrice;
  const priceReturn = computePriceReturn(investmentAmount, endingShareValue);

  // Bounded to the holding window on both ends — computeEligibleDividends
  // and simulateReinvestment only enforce a lower bound (ex_date >=
  // purchaseDate) internally, so the upper bound (never count a
  // distribution declared after the sale date) is enforced here first.
  const boundedDistributions = distributions.filter(
    (d) => d.ex_date >= purchase.effectiveDate && d.ex_date <= sale.effectiveDate
  );

  const eligible = computeEligibleDividends(boundedDistributions, purchase.effectiveDate, shares);
  const distributionLineItems: DistributionLineItem[] = eligible.map((d) => ({
    exDate: d.exDate,
    payDate: d.payDate,
    amountPerShare: d.amountPerShare,
    shares,
    cashReceived: d.totalReceived,
  }));
  const totalDistributionsReceived = eligible.reduce((sum, d) => sum + d.totalReceived, 0);
  const distributionPerShareTotal = eligible.reduce((sum, d) => sum + d.amountPerShare, 0);

  const totalReturnCash = computeTotalReturn(investmentAmount, endingShareValue, totalDistributionsReceived);
  const holdingDays = daysBetween(purchase.effectiveDate, sale.effectiveDate);
  const annualizedReturnPctCash =
    totalReturnCash.pct != null ? computeAnnualizedReturnPct(totalReturnCash.pct, holdingDays) : null;

  const { finalShares: dripFinalShares } = simulateReinvestment(
    history,
    boundedDistributions,
    purchase.effectiveDate,
    shares
  );
  const dripFinalValue = dripFinalShares * sale.effectivePrice;
  const dripTotalReturn = computeTotalReturn(investmentAmount, dripFinalValue, 0);
  const dripAnnualizedReturnPct =
    dripTotalReturn.pct != null ? computeAnnualizedReturnPct(dripTotalReturn.pct, holdingDays) : null;

  return {
    ok: true,
    requestedPurchaseDate: purchaseDateIso,
    purchaseDate: purchase.effectiveDate,
    purchaseDateAdjusted: purchase.dateAdjusted,
    purchasePrice: purchase.effectivePrice,
    requestedSaleDate: saleDateIso,
    saleDate: sale.effectiveDate,
    saleDateAdjusted: sale.dateAdjusted,
    salePrice: sale.effectivePrice,
    investmentAmount,
    shares,
    endingShareValue,
    priceGainLoss: priceReturn.amount,
    priceReturnPct: priceReturn.pct,
    distributions: distributionLineItems,
    totalDistributionsReceived,
    distributionPerShareTotal,
    finalValueCash: totalReturnCash.amount + investmentAmount, // = endingShareValue + totalDistributionsReceived
    profitLossCash: totalReturnCash.amount,
    totalReturnPctCash: totalReturnCash.pct,
    annualizedReturnPctCash,
    dripFinalShares,
    dripFinalValue,
    dripProfitLoss: dripTotalReturn.amount,
    dripTotalReturnPct: dripTotalReturn.pct,
    dripAnnualizedReturnPct,
    holdingDays,
  };
}

"use server";

import {
  getEtf,
  getRiskMetrics,
  getPriceHistory,
  getDistributions,
  getDistributionsSince,
  getHomeSnapshot,
  computeRunRateAnnualYieldPct,
  providerLabel,
} from "@/lib/data";
import {
  resolvePurchasePrice,
  latestPriceAtOrBefore,
  resolveSharesAndAmount,
  computeEligibleDividends,
  computePriceReturn,
  computeTotalReturn,
  computeAnnualizedReturnPct,
  computeMaxDrawdownPct,
  computePriceStatus,
  detectSplitWarnings,
  computeAlternativeReturn,
  simulateReinvestment,
  daysBetween,
} from "./calculations";
import { pickAlternatives } from "./alternativePicks";
import { buildQuickReport, type QuickReportHolding } from "./quickReport";
import type { Holding, HoldingResult, AlternativeResult } from "./types";

/** CRADY Portfolio Analyzer Phase 1 — server-side orchestration. A Next.js
 * Server Action (not a route handler, not query-string state) so holdings
 * never round-trip through a URL — matches §16's "no personal info in the
 * result URL" SEO/privacy rule by construction, not by an added noindex
 * rule. Called directly from the client PortfolioAnalyzer component. */

// Enough trading-day rows to cover any realistic purchase date (~14 years
// of trading days) and enough distribution rows to cover a weekly payer's
// entire history — both comfortably under PostgREST's row cap, same
// precedent as the rest of this codebase's large-limit queries.
const PRICE_HISTORY_ROWS = 3650;
const DISTRIBUTION_ROWS = 900;

export type PortfolioAnalysis = {
  holdingResults: HoldingResult[];
  alternativesByHolding: Record<string, AlternativeResult[]>;
  quickReport: string[];
  totals: {
    totalInvested: number;
    totalCurrentValue: number;
    totalDividendsReceived: number;
    totalPriceReturnAmount: number;
    totalReturnAmount: number;
    totalReturnPct: number | null;
    /** Money-weighted average of each holding's own CAGR — an
     * approximation, not a true cash-flow-weighted portfolio IRR (which
     * would require iterative solving across differing purchase dates).
     * Documented here and surfaced in the UI, not hidden as if precise. */
    annualizedReturnPct: number | null;
    estAnnualIncome: number;
    estMonthlyIncome: number;
  };
};

function emptyHoldingResult(
  holding: Holding,
  etfExists: boolean,
  notYetListedAtPurchase: boolean,
  display?: { name: string | null; providerId: string | null; cradyScore: number | null; payoutFrequency: string | null }
): HoldingResult {
  return {
    holding,
    etfExists,
    name: display?.name ?? null,
    providerId: display?.providerId ?? null,
    cradyScore: display?.cradyScore ?? null,
    payoutFrequency: display?.payoutFrequency ?? null,
    notYetListedAtPurchase,
    resolved: null,
    currentPrice: null,
    asOfDate: null,
    priceStatus: "unavailable",
    priceStaleDays: null,
    currentValue: null,
    priceReturnAmount: null,
    priceReturnPct: null,
    eligibleDividends: [],
    totalDividendsReceived: 0,
    totalReturnAmount: null,
    totalReturnPct: null,
    annualizedReturnPct: null,
    maxDrawdownPct: null,
    holdingDays: null,
    splitWarnings: [],
    currentAnnualYieldPct: null,
    estAnnualIncome: null,
    estMonthlyIncome: null,
  };
}

async function computeHoldingResult(holding: Holding, todayIso: string): Promise<HoldingResult> {
  const [etf, risk] = await Promise.all([getEtf(holding.ticker), getRiskMetrics(holding.ticker)]);
  if (!etf) return emptyHoldingResult(holding, false, false);

  const display = {
    name: etf.name,
    providerId: etf.provider_id,
    cradyScore: risk?.crady_score ?? null,
    payoutFrequency:
      etf.payout_frequency && etf.payout_frequency.toLowerCase() !== "unknown" ? etf.payout_frequency : null,
  };

  const [history, distributions, recentDistributions] = await Promise.all([
    getPriceHistory(holding.ticker, PRICE_HISTORY_ROWS),
    getDistributions(holding.ticker, DISTRIBUTION_ROWS),
    getDistributionsSince(holding.ticker, 90),
  ]);

  const resolved = resolvePurchasePrice(history, holding.purchaseDate, holding.avgPurchasePrice);
  if (!resolved) return emptyHoldingResult(holding, true, true, display);

  const { shares, investmentAmount } = resolveSharesAndAmount(
    holding.shares,
    holding.investmentAmount,
    resolved.effectivePrice
  );

  const current = latestPriceAtOrBefore(history, todayIso);
  const currentPrice = current?.close_price ?? null;
  const asOfDate = current?.trade_date ?? null;
  const { status: priceStatus, staleDays: priceStaleDays } = computePriceStatus(asOfDate, todayIso);

  // Price return is always computed on the static (non-compounded) share
  // count — a pure "what did the price alone do to the position you
  // actually bought" figure, kept separate from any reinvestment effect
  // even when reinvestment is on (§4/§5's price-vs-dividend separation
  // rule still applies in the reinvestment scenario).
  const staticCurrentValue = currentPrice != null ? shares * currentPrice : null;
  const priceReturn = staticCurrentValue != null ? computePriceReturn(investmentAmount, staticCurrentValue) : null;

  const eligibleDividends = computeEligibleDividends(distributions, holding.purchaseDate, shares);

  let currentValue: number | null;
  let totalDividendsReceived: number;
  let totalReturn: { amount: number; pct: number | null } | null;

  if (holding.dividendReinvestment) {
    const { finalShares, totalDividendsReinvested } = simulateReinvestment(
      history,
      distributions,
      holding.purchaseDate,
      shares
    );
    currentValue = currentPrice != null ? finalShares * currentPrice : null;
    totalDividendsReceived = totalDividendsReinvested;
    // The reinvested dividends are already embedded in currentValue via
    // the extra compounded shares — passing 0 here avoids double-counting
    // them a second time in the total-return formula.
    totalReturn = currentValue != null ? computeTotalReturn(investmentAmount, currentValue, 0) : null;
  } else {
    currentValue = staticCurrentValue;
    totalDividendsReceived = eligibleDividends.reduce((sum, d) => sum + d.totalReceived, 0);
    totalReturn =
      currentValue != null ? computeTotalReturn(investmentAmount, currentValue, totalDividendsReceived) : null;
  }

  const holdingDays = daysBetween(holding.purchaseDate, todayIso);
  const annualizedReturnPct =
    totalReturn?.pct != null ? computeAnnualizedReturnPct(totalReturn.pct, holdingDays) : null;

  const windowCloses = history
    .filter(
      (h) => h.close_price != null && h.trade_date >= resolved.effectiveDate && h.trade_date <= todayIso
    )
    .map((h) => h.close_price as number);
  const maxDrawdownPct = computeMaxDrawdownPct(windowCloses);

  const splitWarnings = detectSplitWarnings(history, resolved.effectiveDate, todayIso);

  const currentAnnualYieldPct = computeRunRateAnnualYieldPct(recentDistributions, currentPrice);
  const estAnnualIncome =
    currentValue != null && currentAnnualYieldPct != null ? (currentValue * currentAnnualYieldPct) / 100 : null;
  const estMonthlyIncome = estAnnualIncome != null ? estAnnualIncome / 12 : null;

  return {
    holding,
    etfExists: true,
    name: display.name,
    providerId: display.providerId,
    cradyScore: display.cradyScore,
    payoutFrequency: display.payoutFrequency,
    notYetListedAtPurchase: false,
    resolved: {
      ticker: holding.ticker,
      requestedDate: holding.purchaseDate,
      effectiveDate: resolved.effectiveDate,
      effectivePrice: resolved.effectivePrice,
      isEstimatedPrice: resolved.isEstimatedPrice,
      dateAdjusted: resolved.dateAdjusted,
      shares,
      investmentAmount,
    },
    currentPrice,
    asOfDate,
    priceStatus,
    priceStaleDays,
    currentValue,
    priceReturnAmount: priceReturn?.amount ?? null,
    priceReturnPct: priceReturn?.pct ?? null,
    eligibleDividends,
    totalDividendsReceived,
    totalReturnAmount: totalReturn?.amount ?? null,
    totalReturnPct: totalReturn?.pct ?? null,
    annualizedReturnPct,
    maxDrawdownPct,
    holdingDays,
    splitWarnings,
    currentAnnualYieldPct,
    estAnnualIncome,
    estMonthlyIncome,
  };
}

async function computeAlternativesForHolding(
  holding: Holding,
  result: HoldingResult,
  homeSnapshot: Awaited<ReturnType<typeof getHomeSnapshot>>,
  todayIso: string,
  lang: "en" | "ko"
): Promise<AlternativeResult[]> {
  if (!result.resolved || !result.etfExists) return [];

  const picks = pickAlternatives(holding.ticker, homeSnapshot, providerLabel, lang);
  const investmentAmount = result.resolved.investmentAmount;

  const results = await Promise.all(
    picks.map(async (pick) => {
      const [altHistory, altDistributions] = await Promise.all([
        getPriceHistory(pick.ticker, PRICE_HISTORY_ROWS),
        getDistributions(pick.ticker, DISTRIBUTION_ROWS),
      ]);
      const alt = computeAlternativeReturn(
        altHistory,
        altDistributions,
        holding.purchaseDate,
        investmentAmount,
        todayIso
      );
      const altCurrent = latestPriceAtOrBefore(altHistory, todayIso);
      const { status } = computePriceStatus(altCurrent?.trade_date ?? null, todayIso);

      const out: AlternativeResult = {
        ticker: pick.ticker,
        category: pick.category,
        reason: pick.reason,
        currentValue: alt?.currentValue ?? null,
        dividendsReceived: alt?.dividendsReceived ?? null,
        totalReturnPct: alt?.totalReturnPct ?? null,
        maxDrawdownPct: alt?.maxDrawdownPct ?? null,
        priceStatus: alt ? status : "unavailable",
      };
      return out;
    })
  );

  // §13/§9 — never force a comparison an ETF has no real data for.
  return results.filter((r) => r.currentValue != null);
}

export async function analyzePortfolio(
  holdings: Holding[],
  lang: "en" | "ko" = "en"
): Promise<PortfolioAnalysis> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [holdingResults, homeSnapshot] = await Promise.all([
    Promise.all(holdings.map((h) => computeHoldingResult(h, todayIso))),
    getHomeSnapshot(),
  ]);

  const alternativesByHolding: Record<string, AlternativeResult[]> = {};
  for (let i = 0; i < holdings.length; i++) {
    alternativesByHolding[holdings[i].id] = await computeAlternativesForHolding(
      holdings[i],
      holdingResults[i],
      homeSnapshot,
      todayIso,
      lang
    );
  }

  const valid = holdingResults.filter((r) => r.resolved != null && r.currentValue != null);
  const totalInvested = valid.reduce((s, r) => s + r.resolved!.investmentAmount, 0);
  const totalCurrentValue = valid.reduce((s, r) => s + (r.currentValue ?? 0), 0);
  const totalDividendsReceived = valid.reduce((s, r) => s + r.totalDividendsReceived, 0);
  const totalPriceReturnAmount = valid.reduce((s, r) => s + (r.priceReturnAmount ?? 0), 0);
  const totalReturnAmount = totalCurrentValue + totalDividendsReceived - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturnAmount / totalInvested) * 100 : null;
  const estAnnualIncome = valid.reduce((s, r) => s + (r.estAnnualIncome ?? 0), 0);
  const estMonthlyIncome = estAnnualIncome / 12;

  const annualizedCandidates = valid.filter((r) => r.annualizedReturnPct != null);
  const annualizedWeight = annualizedCandidates.reduce((s, r) => s + r.resolved!.investmentAmount, 0);
  const annualizedReturnPct =
    annualizedWeight > 0
      ? annualizedCandidates.reduce((s, r) => s + r.annualizedReturnPct! * r.resolved!.investmentAmount, 0) /
        annualizedWeight
      : null;

  // Best real alternative across all holdings, for the Quick Report's one
  // comparison sentence — the favorable-most delta among any that exist.
  let bestAlternative: { forTicker: string; altTicker: string; deltaAmount: number } | null = null;
  for (const h of holdings) {
    const hr = holdingResults.find((r) => r.holding.id === h.id);
    if (!hr || hr.resolved == null) continue;
    for (const alt of alternativesByHolding[h.id] ?? []) {
      if (alt.currentValue == null || alt.dividendsReceived == null) continue;
      const altTotalReturnAmount = alt.currentValue + alt.dividendsReceived - hr.resolved.investmentAmount;
      const deltaAmount = altTotalReturnAmount - (hr.totalReturnAmount ?? 0);
      if (bestAlternative == null || Math.abs(deltaAmount) > Math.abs(bestAlternative.deltaAmount)) {
        bestAlternative = { forTicker: h.ticker, altTicker: alt.ticker, deltaAmount };
      }
    }
  }

  const reportHoldings: QuickReportHolding[] = holdingResults.map((r) => ({
    ticker: r.holding.ticker,
    providerId: r.resolved ? providerLabel(providerIdOf(homeSnapshot, r.holding.ticker)) : "Unknown",
    investmentAmount: r.resolved?.investmentAmount ?? 0,
    totalReturnAmount: r.totalReturnAmount,
    priceStatus: r.priceStatus === "current" || r.priceStatus === "delayed" ? r.priceStatus : "unavailable",
    priceStaleDays: r.priceStaleDays,
    hasSplitWarning: r.splitWarnings.length > 0,
  }));

  const quickReport = buildQuickReport(
    {
      holdings: reportHoldings,
      totalInvested,
      totalCurrentValue,
      totalDividendsReceived,
      totalPriceReturnAmount,
      totalReturnAmount,
      totalReturnPct,
      bestAlternative,
    },
    lang
  );

  return {
    holdingResults,
    alternativesByHolding,
    quickReport,
    totals: {
      totalInvested,
      totalCurrentValue,
      totalDividendsReceived,
      totalPriceReturnAmount,
      totalReturnAmount,
      totalReturnPct,
      annualizedReturnPct,
      estAnnualIncome,
      estMonthlyIncome,
    },
  };
}

function providerIdOf(snapshot: Awaited<ReturnType<typeof getHomeSnapshot>>, ticker: string): string {
  return snapshot.find((s) => s.ticker === ticker)?.provider_id ?? "unknown";
}

/** CRADY ETF Calculator — pure projection engine.
 *
 * This is a genuinely different tool from the Portfolio Analyzer
 * (lib/portfolio/calculations.ts): the Portfolio Analyzer computes REAL
 * historical returns from actual recorded price/distribution history for
 * a past purchase date. This engine projects a FORWARD-LOOKING,
 * assumption-based estimate — there is no real future data, so every
 * output here is only as good as the return/fee/yield assumptions typed
 * in. Every function is pure (no I/O, no Date.now()) so the whole engine
 * can be independently recomputed and checked — see calculations.test.ts.
 *
 * Model: monthly-step simulation, not a closed-form annuity formula —
 * chosen specifically so "reinvest distributions ON/OFF" and "$0 monthly
 * contribution" are just natural branches/values in the same loop rather
 * than separate formulas that could silently drift apart, and so the
 * month-by-month math stays auditable (each step is one line: add this
 * month's contribution, apply this month's growth, decide whether this
 * month's distribution compounds or is paid out as cash). */

export type CalculatorInputs = {
  /** Lump sum invested at time zero. Clamped to >= 0. */
  initialInvestment: number;
  /** Added at the start of every month. Clamped to >= 0. */
  monthlyInvestment: number;
  /** Projection horizon in years. Clamped to > 0. */
  years: number;
  /** Assumed TOTAL annual return (price appreciation + distributions),
   * before fees — e.g. 8 for "8% per year". Can be negative (a covered-call
   * fund whose distribution yield exceeds its total return is a realistic,
   * not a broken, scenario). */
  expectedAnnualReturnPct: number;
  /** Annual expense ratio / fee drag, e.g. 0.15 for "0.15%". Clamped to >= 0. */
  annualFeePct: number;
  /** The portion of expectedAnnualReturnPct assumed to arrive as cash
   * distributions rather than price appreciation, e.g. 8 if the fund's
   * entire assumed return is distribution yield. Clamped to >= 0. Defaults
   * to 0 (a pure growth-ETF assumption) when the caller has no real or
   * user-supplied yield figure. */
  distributionYieldPct: number;
  /** ON: every distribution is immediately used to buy more (fractional)
   * shares, so it compounds like price return. OFF: distributions are paid
   * out as cash and tracked separately — they do not compound into the
   * portfolio balance. */
  reinvestDistributions: boolean;
};

export type YearlySnapshot = {
  year: number;
  contributions: number;
  portfolioValue: number;
  distributionsReceived: number;
};

export type CalculatorResult = {
  yearly: YearlySnapshot[];
  totalContributions: number;
  /** Excludes non-reinvested distributions — see totalDistributionsReceived. */
  endingPortfolioValue: number;
  /** 0 whenever reinvestDistributions is true (they're already inside
   * endingPortfolioValue via the extra compounded "shares"). */
  totalDistributionsReceived: number;
  /** (endingPortfolioValue + totalDistributionsReceived) - totalContributions. */
  totalEstimatedReturnAmount: number;
  /** null only when totalContributions is 0 (nothing was ever invested). */
  totalReturnPct: number | null;
  /** CAGR-style, reusing the exact same formula as the Portfolio Analyzer
   * (computeAnnualizedReturnPct) — not reimplemented here. */
  annualizedReturnPct: number | null;
  /** (endingPortfolioValue + totalDistributionsReceived) / totalContributions. */
  moneyMultiple: number | null;
};

const MAX_YEARS = 60;

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** CAGR from a total-return percentage over an exact number of years —
 * identical formula to lib/portfolio/calculations.ts's
 * computeAnnualizedReturnPct, reimplemented locally on a years basis
 * (that function takes holding *days*) rather than importing across the
 * portfolio/calculator boundary for two conceptually distinct engines. */
function annualizeReturnPct(totalReturnPct: number, years: number): number | null {
  if (years < 1 / 365.25) return null;
  const base = 1 + totalReturnPct / 100;
  if (base < 0) return null;
  return (Math.pow(base, 1 / years) - 1) * 100;
}

export function sanitizeCalculatorInputs(raw: Partial<CalculatorInputs>): CalculatorInputs {
  return {
    initialInvestment: clampNonNegative(raw.initialInvestment ?? 0),
    monthlyInvestment: clampNonNegative(raw.monthlyInvestment ?? 0),
    years: Math.min(Math.max(Number.isFinite(raw.years) ? (raw.years as number) : 0, 0), MAX_YEARS),
    expectedAnnualReturnPct: Number.isFinite(raw.expectedAnnualReturnPct) ? (raw.expectedAnnualReturnPct as number) : 0,
    annualFeePct: clampNonNegative(raw.annualFeePct ?? 0),
    distributionYieldPct: clampNonNegative(raw.distributionYieldPct ?? 0),
    reinvestDistributions: raw.reinvestDistributions ?? true,
  };
}

export function calculateEtfProjection(rawInputs: Partial<CalculatorInputs>): CalculatorResult {
  const inputs = sanitizeCalculatorInputs(rawInputs);
  const { initialInvestment, monthlyInvestment, years, expectedAnnualReturnPct, annualFeePct, distributionYieldPct, reinvestDistributions } = inputs;

  const months = Math.round(years * 12);

  // Fee always drags total return, regardless of source. The distribution
  // portion is carved out of the net figure; whatever remains is treated
  // as price appreciation (which can be negative — e.g. a fund yielding
  // more than its net total return, a real and common covered-call
  // pattern documented elsewhere on CRADY).
  const netAnnualReturnPct = expectedAnnualReturnPct - annualFeePct;
  const priceReturnPct = netAnnualReturnPct - distributionYieldPct;
  const monthlyPriceRate = priceReturnPct / 100 / 12;
  const monthlyDistRate = distributionYieldPct / 100 / 12;

  let balance = initialInvestment;
  let contributions = initialInvestment;
  let distributionsReceived = 0;

  const yearly: YearlySnapshot[] = [{ year: 0, contributions, portfolioValue: balance, distributionsReceived }];

  for (let month = 1; month <= months; month++) {
    balance += monthlyInvestment;
    contributions += monthlyInvestment;

    const distThisMonth = balance * monthlyDistRate;
    const priceGrowthThisMonth = balance * monthlyPriceRate;

    if (reinvestDistributions) {
      balance += priceGrowthThisMonth + distThisMonth;
    } else {
      balance += priceGrowthThisMonth;
      distributionsReceived += distThisMonth;
    }

    if (month % 12 === 0) {
      yearly.push({ year: month / 12, contributions, portfolioValue: balance, distributionsReceived });
    }
  }
  // A fractional final year (e.g. 2.5 years) isn't reachable today since
  // the UI only offers whole-year steps, but the loop above supports it —
  // capture the true endpoint rather than silently truncating to the last
  // whole year if one is ever passed in.
  if (months % 12 !== 0) {
    yearly.push({ year: years, contributions, portfolioValue: balance, distributionsReceived });
  }

  const totalContributions = contributions;
  const endingPortfolioValue = balance;
  const totalEstimatedReturnAmount = endingPortfolioValue + distributionsReceived - totalContributions;
  const totalReturnPct = totalContributions > 0 ? (totalEstimatedReturnAmount / totalContributions) * 100 : null;
  const annualizedReturnPct = totalReturnPct != null && years > 0 ? annualizeReturnPct(totalReturnPct, years) : null;
  const moneyMultiple = totalContributions > 0 ? (endingPortfolioValue + distributionsReceived) / totalContributions : null;

  return {
    yearly,
    totalContributions,
    endingPortfolioValue,
    totalDistributionsReceived: distributionsReceived,
    totalEstimatedReturnAmount,
    totalReturnPct,
    annualizedReturnPct,
    moneyMultiple,
  };
}

/** CRADY Portfolio Analyzer Phase 1 — shared types.
 *
 * A Holding is exactly what the user typed in, unresolved. Everything
 * derived from real price/dividend data lives in HoldingResult, kept
 * strictly separate so it's obvious in the type system which values are
 * user input vs. computed from real data. */

export type Holding = {
  id: string;
  ticker: string;
  /** YYYY-MM-DD, exactly as entered — may fall on a non-trading day. */
  purchaseDate: string;
  /** Exactly one of shares/investmentAmount is the user's real input; the
   * other is derived once a price is resolved. Both nullable so a
   * half-filled form can still round-trip through localStorage. */
  shares: number | null;
  investmentAmount: number | null;
  /** Null = auto-estimate from the nearest trading day's close. */
  avgPurchasePrice: number | null;
  dividendReinvestment: boolean;
};

export type PriceDataStatus = "current" | "delayed" | "incomplete" | "estimated" | "unavailable";

export type ResolvedPurchase = {
  ticker: string;
  requestedDate: string;
  /** Nearest trading day <= requestedDate that has a real close price. */
  effectiveDate: string;
  effectivePrice: number;
  isEstimatedPrice: boolean;
  dateAdjusted: boolean;
  shares: number;
  investmentAmount: number;
};

export type EligibleDividend = {
  exDate: string;
  payDate: string;
  amountPerShare: number;
  totalReceived: number;
};

export type SplitWarning = {
  /** The trading day where an unexplained, extreme single-day price ratio
   * was detected — return math around this date may be distorted by an
   * unrecorded split/reverse-split (the pipeline has no split-ratio data
   * to auto-correct for). */
  date: string;
  ratio: number;
};

export type HoldingResult = {
  holding: Holding;
  etfExists: boolean;
  /** Display-only fields for the ETF Card (§ "추가 요구사항" 1) — carried on
   * HoldingResult rather than re-fetched by the UI, so the card never
   * shows a number that disagrees with the rest of the analysis. */
  name: string | null;
  providerId: string | null;
  cradyScore: number | null;
  dividendStabilityScore: number | null;
  payoutFrequency: string | null;
  underlyingTicker: string | null;
  /** "single-stock-covered-call" | "index-covered-call" | "traditional-dividend" | "treasury-bond" — see lib/ticker/nextDividendIntelligence.ts's classifyEtfType, reused here for concentration grouping and the ETF Card's Strategy Type field. */
  etfType: string | null;
  incomeScore: number | null;
  safetyScore: number | null;
  momentumScore: number | null;
  riskLevel: string | null;
  /** Latest close vs. the prior trading day's close — for the ETF Card's
   * "Today's Change" field (Part C §21). */
  todayChangePct: number | null;
  /** True once the requested purchase date is before the ETF's first
   * recorded trading day (i.e., not listed yet on that date). */
  notYetListedAtPurchase: boolean;
  resolved: ResolvedPurchase | null;
  currentPrice: number | null;
  asOfDate: string | null;
  priceStatus: PriceDataStatus;
  priceStaleDays: number | null;
  currentValue: number | null;
  priceReturnAmount: number | null;
  priceReturnPct: number | null;
  eligibleDividends: EligibleDividend[];
  totalDividendsReceived: number;
  totalReturnAmount: number | null;
  totalReturnPct: number | null;
  annualizedReturnPct: number | null;
  maxDrawdownPct: number | null;
  holdingDays: number | null;
  splitWarnings: SplitWarning[];
  /** Current run-rate annualized yield (same methodology as the rest of
   * the site — trailing-90-day paid distributions annualized against the
   * current price), used to project forward income. Distinct from
   * totalReturnPct, which is about money already received. */
  currentAnnualYieldPct: number | null;
  estAnnualIncome: number | null;
  estMonthlyIncome: number | null;
};

export type AlternativeCategory =
  | "similar-income"
  | "lower-risk-income"
  | "better-income-stability"
  | "same-provider"
  | "better-risk-adjusted";

export type AlternativeResult = {
  ticker: string;
  category: AlternativeCategory;
  reason: string;
  currentValue: number | null;
  dividendsReceived: number | null;
  totalReturnPct: number | null;
  maxDrawdownPct: number | null;
  priceStatus: PriceDataStatus;
};

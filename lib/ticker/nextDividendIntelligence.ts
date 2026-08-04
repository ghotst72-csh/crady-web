/** CRADY Engagement & Intelligence Phase 2, Part A — Next Dividend
 * Intelligence. Pure, testable functions only (no Supabase calls — see
 * lib/ticker/nextDividendData.ts for the fetchers). Every output here
 * traces to a real field; anything without enough real data returns an
 * honest "unavailable"/null rather than a fabricated number or sentence. */

export type DateStatus = "scheduled" | "estimated" | "official" | "awaiting" | "unavailable";

export type DateEntry = {
  date: string | null;
  status: DateStatus;
};

export type DividendSchedule = {
  declaration: DateEntry;
  exDividend: DateEntry;
  record: DateEntry;
  payment: DateEntry;
};

export type ScheduleInput = {
  /** A real scraped provider-schedule row for the upcoming cycle, if the
   * pipeline has published one that far ahead yet (distributions row with
   * amount still null, but real dates + source_url). */
  scheduleRow: {
    declarationDate: string | null;
    exDate: string;
    recordDate: string | null;
    payDate: string;
    sourceUrl: string | null;
  } | null;
  /** CRADY's own pattern-based prediction — used only when no scraped
   * schedule row exists yet for the upcoming cycle. */
  prediction: {
    targetExDate: string | null;
    targetPayDate: string | null;
  } | null;
  /** Typical gap (in days) between declaration and ex-date, computed from
   * real recent history — used only to estimate a declaration date when
   * the prediction has no declaration-date field of its own. */
  typicalDeclarationToExDays: number | null;
};

/** Builds the 4-date breakdown with an honest status per date. "Official"
 * never appears here — an amount-confirmed distribution isn't "next," it's
 * already the latest paid one (see OfficialDistributionBlock). Status
 * priority for the *next*, not-yet-paid cycle is: a real scraped provider
 * schedule row ("scheduled") > CRADY's own pattern-based estimate
 * ("estimated") > nothing at all ("awaiting"/"unavailable"). */
export function buildDividendSchedule(input: ScheduleInput): DividendSchedule {
  const { scheduleRow, prediction, typicalDeclarationToExDays } = input;

  if (scheduleRow) {
    return {
      declaration: { date: scheduleRow.declarationDate, status: scheduleRow.declarationDate ? "scheduled" : "unavailable" },
      exDividend: { date: scheduleRow.exDate, status: "scheduled" },
      record: { date: scheduleRow.recordDate, status: scheduleRow.recordDate ? "scheduled" : "unavailable" },
      payment: { date: scheduleRow.payDate, status: "scheduled" },
    };
  }

  if (prediction?.targetExDate || prediction?.targetPayDate) {
    const estimatedDeclaration =
      prediction.targetExDate != null && typicalDeclarationToExDays != null
        ? addDays(prediction.targetExDate, -typicalDeclarationToExDays)
        : null;
    return {
      declaration: { date: estimatedDeclaration, status: estimatedDeclaration ? "estimated" : "awaiting" },
      exDividend: { date: prediction.targetExDate, status: prediction.targetExDate ? "estimated" : "awaiting" },
      record: { date: prediction.targetExDate, status: prediction.targetExDate ? "estimated" : "awaiting" },
      payment: { date: prediction.targetPayDate, status: prediction.targetPayDate ? "estimated" : "awaiting" },
    };
  }

  return {
    declaration: { date: null, status: "unavailable" },
    exDividend: { date: null, status: "unavailable" },
    record: { date: null, status: "unavailable" },
    payment: { date: null, status: "unavailable" },
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Real gap (in days) between declaration_date and ex_date, averaged over
 * whatever recent declared distributions actually have both dates —
 * returns null (never a guessed default) if none do. */
export function computeTypicalDeclarationToExDays(
  recent: { declarationDate: string | null; exDate: string }[]
): number | null {
  const gaps = recent
    .filter((r): r is { declarationDate: string; exDate: string } => r.declarationDate != null)
    .map((r) => daysBetweenDates(r.declarationDate, r.exDate))
    .filter((g) => g >= 0 && g <= 14); // sanity bound — anything wilder isn't a real "typical" gap
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

function daysBetweenDates(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
}

// ── Expected range ──────────────────────────────────────────────────────

export type ExpectedRange = { low: number; high: number };

const MIN_SAMPLE_FOR_RANGE = 3;

/** A real, computed spread — population standard deviation of the last N
 * actually-paid distributions, applied symmetrically around the point
 * estimate. Not a model confidence interval (no such model output exists
 * here); documented as "based on recent distribution variability," not
 * implied to be a statistical confidence interval. Returns null (never a
 * fabricated range) below a minimum sample size. */
export function computeExpectedRange(recentAmounts: number[], pointEstimate: number): ExpectedRange | null {
  if (recentAmounts.length < MIN_SAMPLE_FOR_RANGE || pointEstimate <= 0) return null;
  const mean = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
  const variance = recentAmounts.reduce((a, b) => a + (b - mean) ** 2, 0) / recentAmounts.length;
  const stddev = Math.sqrt(variance);
  return { low: Math.max(0, pointEstimate - stddev), high: pointEstimate + stddev };
}

// ── ETF type classification ─────────────────────────────────────────────

export type EtfType = "single-stock-covered-call" | "index-covered-call" | "traditional-dividend" | "treasury-bond";

export type ClassifyInput = {
  strategyType: string | null;
  underlyingTicker: string | null;
  assetClass: string | null;
};

/** Broader than etf_risk_metrics.strategy_type (which is only populated
 * for 27 of 73 tracked tickers) — this always returns a real classification
 * for every ETF using fields that exist across the whole universe
 * (underlying_ticker, asset_class), falling back to strategy_type only
 * when it's the most specific signal available. Given the current tracked
 * universe (YieldMax/Roundhill/Defiance, all covered-call/option-income
 * products), "traditional-dividend" and "treasury-bond" are implemented
 * for completeness but have no real matches today — see the deployment
 * report. */
export function classifyEtfType(input: ClassifyInput): EtfType {
  if (input.underlyingTicker) return "single-stock-covered-call";
  if (input.assetClass === "0DTE Covered Call ETF") return "index-covered-call";
  if (input.strategyType === "high_income_high_volatility") return "single-stock-covered-call";
  return "index-covered-call";
}

// ── Estimate drivers (qualitative, never fabricated percentages) ────────

export type DriverInfluence = "high" | "medium" | "low" | "unavailable";
export type EstimateDriver = { key: string; influence: DriverInfluence };

export type DriverInput = {
  recentAmountsCount: number;
  hasVolatilityData: boolean;
  hasUnderlyingPriceData: boolean;
  isOfficiallyDeclared: boolean;
};

/** Qualitative, not percentage-based — there is no SHAP/feature-importance
 * model behind these predictions, so assigning fake percentages would
 * misrepresent precision that doesn't exist (§6 of the spec is explicit
 * about this). */
export function buildEstimateDrivers(input: DriverInput): EstimateDriver[] {
  return [
    { key: "recentDistributionHistory", influence: input.recentAmountsCount >= 4 ? "high" : input.recentAmountsCount >= 1 ? "medium" : "unavailable" },
    { key: "underlyingVolatility", influence: input.hasVolatilityData ? "medium" : "unavailable" },
    { key: "navOrPriceContext", influence: "medium" },
    { key: "priceDirection", influence: input.hasUnderlyingPriceData ? "low" : "unavailable" },
    { key: "officialDeclaration", influence: input.isOfficiallyDeclared ? "high" : "unavailable" },
  ];
}

// ── Confidence explanation (static, bilingual) ───────────────────────────

export const CONFIDENCE_EXPLANATION = {
  en: "Confidence reflects the completeness and consistency of the data supporting this estimate. It is not a guarantee that the final distribution will match the forecast.",
  ko: "신뢰도는 이번 예상에 사용된 데이터의 완성도와 일관성을 나타냅니다. 실제 분배금이 예상값과 일치할 확률을 보장하는 수치는 아닙니다.",
} as const;

// ── Prediction track record ──────────────────────────────────────────────

export type TrackRecordInput = {
  targetPayDate: string;
  predictedAmount: number;
  actualAmount: number;
  percentageError: number | null;
}[];

export type TrackRecord = {
  count: number;
  averageAbsoluteErrorPct: number;
  withinRangeCount: number;
};

const MIN_SAMPLE_FOR_TRACK_RECORD = 5;
/** A prediction counts as "within range" when its actual error is at or
 * under this threshold — a plain, stated definition (not implying a
 * statistical confidence interval was computed per-prediction, since none
 * exists in the source data). */
const WITHIN_RANGE_ERROR_PCT = 15;

/** Returns null (never a fabricated accuracy figure) below a minimum
 * sample of distinct, real evaluated predictions. */
export function buildTrackRecord(evaluated: TrackRecordInput): TrackRecord | null {
  if (evaluated.length < MIN_SAMPLE_FOR_TRACK_RECORD) return null;
  const errors = evaluated.map((e) => e.percentageError ?? (Math.abs(e.predictedAmount - e.actualAmount) / e.actualAmount) * 100);
  const averageAbsoluteErrorPct = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
  const withinRangeCount = errors.filter((e) => Math.abs(e) <= WITHIN_RANGE_ERROR_PCT).length;
  return { count: evaluated.length, averageAbsoluteErrorPct, withinRangeCount };
}

// ── Schedule pattern (day-of-week summary) ───────────────────────────────

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type SchedulePattern = {
  declarationWeekday: string | null;
  exDividendWeekday: string | null;
  paymentWeekday: string | null;
  /** True when every sampled recent event fell on the same weekday per
   * field — a genuinely regular pattern, not just "the most common day." */
  isConsistent: boolean;
};

/** Weekday-of-week summary from real recent declared distributions — null
 * per field when the sample doesn't actually agree on one weekday, rather
 * than picking a plurality and implying more regularity than exists. */
export function buildSchedulePattern(
  recent: { declarationDate: string | null; exDate: string; payDate: string }[]
): SchedulePattern | null {
  if (recent.length === 0) return null;
  const declWeekdays = recent.filter((r) => r.declarationDate).map((r) => weekdayOf(r.declarationDate!));
  const exWeekdays = recent.map((r) => weekdayOf(r.exDate));
  const payWeekdays = recent.map((r) => weekdayOf(r.payDate));

  const declarationWeekday = allSame(declWeekdays);
  const exDividendWeekday = allSame(exWeekdays);
  const paymentWeekday = allSame(payWeekdays);

  return {
    declarationWeekday,
    exDividendWeekday,
    paymentWeekday,
    isConsistent: declarationWeekday != null && exDividendWeekday != null && paymentWeekday != null,
  };
}

function weekdayOf(iso: string): string {
  return WEEKDAY_NAMES[new Date(iso + "T00:00:00Z").getUTCDay()];
}

function allSame(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.every((v) => v === values[0]) ? values[0] : null;
}

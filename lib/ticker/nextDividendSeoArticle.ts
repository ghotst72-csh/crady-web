import { providerLabel } from "@/lib/providers";
import type { NextDividendIntelligenceData } from "./buildNextDividendIntelligenceData";
import { buildNextDividendFaq, type NextDividendFaqItem } from "./nextDividendNarrative";
import type { OfficialDistributionForTicker } from "@/lib/distributions/data";

/** CRADY Next Dividend SEO Landing Page (/{ticker}/next-dividend) — pure,
 * testable content-generation only, no Supabase calls and no new
 * prediction math. Every function here composes real fields already
 * produced by buildNextDividendIntelligenceData() (the estimate side) and
 * getLatestOfficialDistributionForTicker() (the official side) — the same
 * two data sources the existing Next Dividend tab already uses. When a
 * value doesn't exist, the honest response is a shorter sentence or a
 * null/omitted field, never a fabricated number or date. */

// ── Current-cycle state resolution ──────────────────────────────────────
//
// buildNextDividendIntelligenceData() always returns isOfficial: false —
// today the ticker page shows the estimate hero and a *separate*, always-
// visible "latest paid distribution" block below it, rather than one
// panel that flips state. This page needs the single-panel auto-transition
// behavior the spec asks for, so this resolves which state currently
// applies: a real declared distribution counts as "the current cycle" if
// its payment date is recent or still upcoming; otherwise it's old news
// and the estimate for the *next* cycle is what's current.

/** Same 14-day window buildNextDividendIntelligenceData.ts already uses
 * (RECENT_TRANSITION_DAYS) for "is this resolved event still the one a
 * visitor cares about" — reused rather than inventing a second constant. */
export const RECENT_OFFICIAL_WINDOW_DAYS = 14;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
}

export type ResolvedNextDividend = {
  ticker: string;
  isOfficial: boolean;
  amount: number | null;
  exDate: string | null;
  payDate: string | null;
  declarationDate: string | null;
  confidence: number | null;
  previousAmount: number | null;
  changeFromLastPct: number | null;
  expectedRange: { low: number; high: number } | null;
  sourceUrl: string | null;
  comparisonToPrediction: { predictedAmount: number; actualAmount: number; errorPct: number | null } | null;
};

export function resolveNextDividend(input: {
  ticker: string;
  intelligence: NextDividendIntelligenceData;
  officialDistribution: OfficialDistributionForTicker | null;
  todayIso: string;
}): ResolvedNextDividend {
  const { ticker, intelligence, officialDistribution, todayIso } = input;

  const officialIsCurrentCycle =
    officialDistribution != null &&
    officialDistribution.amount != null &&
    daysBetween(officialDistribution.payDate, todayIso) <= RECENT_OFFICIAL_WINDOW_DAYS;

  if (officialIsCurrentCycle && officialDistribution && officialDistribution.amount != null) {
    // Only ever shown when both the prior CRADY prediction and this exact
    // official outcome are real and refer to the same event (exact amount
    // match) — never inferred.
    const comparisonToPrediction =
      intelligence.forecastVsOfficial && intelligence.forecastVsOfficial.actualAmount === officialDistribution.amount
        ? intelligence.forecastVsOfficial
        : null;

    const previousAmount = intelligence.recentAmounts.find((a) => a !== officialDistribution.amount) ?? null;
    const changeFromLastPct =
      previousAmount != null && previousAmount > 0
        ? ((officialDistribution.amount - previousAmount) / previousAmount) * 100
        : null;

    return {
      ticker,
      isOfficial: true,
      amount: officialDistribution.amount,
      exDate: officialDistribution.exDate,
      payDate: officialDistribution.payDate,
      declarationDate: officialDistribution.declarationDate,
      confidence: null,
      previousAmount,
      changeFromLastPct,
      expectedRange: null,
      sourceUrl: officialDistribution.sourceUrl,
      comparisonToPrediction,
    };
  }

  const amount = intelligence.pointEstimate;
  const changeFromLastPct =
    amount != null && intelligence.previousAmount != null && intelligence.previousAmount > 0
      ? ((amount - intelligence.previousAmount) / intelligence.previousAmount) * 100
      : null;

  return {
    ticker,
    isOfficial: false,
    amount,
    exDate: intelligence.schedule.exDividend.date,
    payDate: intelligence.schedule.payment.date,
    declarationDate: intelligence.schedule.declaration.date,
    confidence: intelligence.confidence,
    previousAmount: intelligence.previousAmount,
    changeFromLastPct,
    expectedRange: intelligence.expectedRange,
    sourceUrl: null,
    comparisonToPrediction: null,
  };
}

// ── Week / month label ───────────────────────────────────────────────────

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_KO_SUFFIX = "월";

function parts(iso: string): { y: number; m: number; d: number } {
  const dt = new Date(iso + "T00:00:00Z");
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/** "Week of August 17-21, 2026" (Mon-Fri span containing the ex-date) —
 * built only from a real ex-date, never guessed. Handles the span crossing
 * a month or year boundary. */
export function buildWeekLabel(exDateIso: string | null, lang: "en" | "ko" = "en"): string | null {
  if (!exDateIso) return null;
  const d = new Date(exDateIso + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (dow + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - mondayOffset);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);

  const mp = parts(monday.toISOString().slice(0, 10));
  const fp = parts(friday.toISOString().slice(0, 10));

  if (lang === "ko") {
    return mp.y === fp.y && mp.m === fp.m
      ? `${mp.y}년 ${mp.m + 1}월 ${mp.d}일-${fp.d}일`
      : mp.y === fp.y
        ? `${mp.y}년 ${mp.m + 1}${MONTHS_KO_SUFFIX} ${mp.d}일 - ${fp.m + 1}${MONTHS_KO_SUFFIX} ${fp.d}일`
        : `${mp.y}년 ${mp.m + 1}월 ${mp.d}일 - ${fp.y}년 ${fp.m + 1}월 ${fp.d}일`;
  }

  if (mp.y === fp.y && mp.m === fp.m) return `${MONTHS_EN[mp.m]} ${mp.d}-${fp.d}, ${fp.y}`;
  if (mp.y === fp.y) return `${MONTHS_EN[mp.m]} ${mp.d} - ${MONTHS_EN[fp.m]} ${fp.d}, ${fp.y}`;
  return `${MONTHS_EN[mp.m]} ${mp.d}, ${mp.y} - ${MONTHS_EN[fp.m]} ${fp.d}, ${fp.y}`;
}

/** "August 2026" fallback framing for a non-weekly cadence (or when only a
 * month-level signal is reliable). */
export function buildMonthLabel(exDateIso: string | null, lang: "en" | "ko" = "en"): string | null {
  if (!exDateIso) return null;
  const { y, m } = parts(exDateIso);
  return lang === "ko" ? `${y}년 ${m + 1}월` : `${MONTHS_EN[m]} ${y}`;
}

// ── Outlook article (the "This Week's X Dividend Outlook" section) ──────

function fmt(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

/** 2 decimals for sub-1% precision (e.g. "0.02%" stays meaningfully
 * distinct from "0%"), 1 decimal otherwise -- matches how this error
 * figure is actually reported elsewhere on real data. */
function fmtErrorPct(pct: number): string {
  const abs = Math.abs(pct);
  return abs < 1 ? abs.toFixed(2) : abs.toFixed(1);
}

/** Same policy rationale as PredictionTrackRecord.tsx's sitewide accuracy
 * lock (prediction engine recalibration in progress): a prediction/actual
 * comparison sentence is only shown in this page's own article body when
 * the miss is small enough not to read as embarrassing on a page built to
 * be found by search. The underlying predicted/actual/errorPct values are
 * never altered or hidden from resolved.comparisonToPrediction itself —
 * only this article-text rendering decision is gated. */
export const MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT = 15;

export type OutlookInput = {
  ticker: string;
  etfName: string | null;
  providerId: string;
  resolved: ResolvedNextDividend;
};

/** The 2-3 paragraph, data-grounded outlook article. Distinct wording from
 * buildWhyThisEstimate (the tab's shorter evidence list) and from the
 * /magazine/{ticker}-next-dividend-prediction article's own FAQ copy —
 * this is written as a self-contained explainer, not a repeat of either. */
export function buildOutlookArticle(input: OutlookInput, lang: "en" | "ko" = "en"): string[] {
  const { ticker, etfName, providerId, resolved } = input;
  const issuer = providerLabel(providerId);
  const nameClause = etfName ? (lang === "ko" ? ` (${etfName})` : `, ${etfName},`) : "";

  if (resolved.isOfficial && resolved.amount != null) {
    const paragraphs: string[] = [];

    paragraphs.push(
      lang === "ko"
        ? `${ticker}${nameClause}의 배당이 주당 ${fmt(resolved.amount)}로 공식 확정되었습니다.${resolved.exDate ? ` 배당락일은 ${resolved.exDate}` : ""}${resolved.payDate ? `, 지급일은 ${resolved.payDate}입니다.` : "."}`
        : `${ticker}${nameClause} distribution has been officially declared at ${fmt(resolved.amount)} per share.${resolved.exDate ? ` The ex-dividend date is ${resolved.exDate}` : ""}${resolved.payDate ? `, and the distribution is scheduled to be paid on ${resolved.payDate}.` : "."}`
    );

    if (resolved.comparisonToPrediction) {
      const { predictedAmount, actualAmount, errorPct } = resolved.comparisonToPrediction;
      const pct = errorPct ?? ((actualAmount - predictedAmount) / predictedAmount) * 100;

      if (Math.abs(pct) <= MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT) {
        const direction = actualAmount >= predictedAmount ? (lang === "ko" ? "높았습니다" : "above") : lang === "ko" ? "낮았습니다" : "below";
        paragraphs.push(
          lang === "ko"
            ? `CRADY는 이전에 이번 분배금을 주당 ${fmt(predictedAmount)}로 예상했습니다. 공식 발표된 ${fmt(actualAmount)}은 예상 대비 약 ${fmtErrorPct(pct)}% ${direction}.`
            : `CRADY had previously estimated the distribution at ${fmt(predictedAmount)} per share. The official distribution of ${fmt(actualAmount)} was approximately ${fmtErrorPct(pct)}% ${direction} the prediction.`
        );
      } else {
        // Same policy as the sitewide PredictionTrackRecord lock (accuracy
        // numbers hidden while the prediction engine is being
        // recalibrated) — the real predicted/actual/error values are still
        // fully intact on resolved.comparisonToPrediction, only this
        // article's public-facing sentence is gated. A large miss simply
        // gets a neutral "now updated" sentence instead of a number that
        // would read as a bad look on a page built specifically to be
        // found by search.
        paragraphs.push(
          lang === "ko"
            ? `공식 분배금이 발표되어 이 페이지가 최신 확정 금액으로 업데이트되었습니다.`
            : `The official distribution has now been announced, and this page has been updated with the latest declared amount.`
        );
      }
    }

    return paragraphs;
  }

  if (resolved.amount != null) {
    const paragraphs: string[] = [];

    paragraphs.push(
      lang === "ko"
        ? `${ticker}${nameClause}의 다음 배당금은 현재 주당 약 ${fmt(resolved.amount)}로 예상됩니다.${resolved.declarationDate ? ` 발표는 ${resolved.declarationDate} 무렵` : ""}${resolved.exDate ? `, 배당락일은 ${resolved.exDate}로 예상되며` : ""}${resolved.payDate ? `, 지급일은 ${resolved.payDate}로 예정되어 있습니다.` : "."}`
        : `${ticker}${nameClause} next dividend is currently estimated at approximately ${fmt(resolved.amount)} per share.${resolved.declarationDate ? ` The distribution is expected to be announced around ${resolved.declarationDate}` : ""}${resolved.exDate ? `, with an expected ex-dividend date of ${resolved.exDate}` : ""}${resolved.payDate ? ` and payment scheduled for ${resolved.payDate}.` : "."}`
    );

    const rangeClause =
      resolved.expectedRange != null
        ? lang === "ko"
          ? ` 현재 예상 범위는 주당 ${fmt(resolved.expectedRange.low)}~${fmt(resolved.expectedRange.high)}입니다.`
          : ` The current expected range is ${fmt(resolved.expectedRange.low)} to ${fmt(resolved.expectedRange.high)} per share.`
        : "";
    paragraphs.push(
      lang === "ko"
        ? `CRADY의 현재 ${ticker} 배당 예측치 ${fmt(resolved.amount)}는 이 ETF의 최근 분배 이력, 분배금 변동성, 가격 흐름, 반복되는 분배 일정을 근거로 산출되었습니다.${rangeClause}`
        : `CRADY's current ${ticker} dividend prediction of ${fmt(resolved.amount)} is based on the ETF's recent distribution history, distribution volatility, price movement, and recurring distribution schedule.${rangeClause}`
    );

    paragraphs.push(
      lang === "ko"
        ? `${fmt(resolved.amount)} 분배금은 아직 ${issuer}가 공식적으로 발표하지 않았습니다. 공식 발표가 나오면 CRADY는 예상치를 자동으로 확정 금액으로 교체하고 이 페이지의 정보를 업데이트합니다.`
        : `The ${fmt(resolved.amount)} distribution has not yet been officially declared by ${issuer}. Once the official distribution is announced, CRADY will automatically replace the estimate with the declared amount and update the information on this page.`
    );

    return paragraphs;
  }

  // Honest short fallback — no fabricated long copy for a ticker CRADY
  // simply doesn't have enough data on yet.
  return [
    lang === "ko"
      ? `${ticker}${nameClause}의 다음 배당을 예상할 만큼 충분한 데이터가 아직 없습니다. 최근 분배 이력이 쌓이면 CRADY가 자동으로 예측을 생성합니다.`
      : `CRADY doesn't have enough recent data yet to estimate ${ticker}'s next dividend.${etfName ? ` (${etfName})` : ""} An estimate will appear automatically once enough distribution history is available.`,
  ];
}

// ── Ex-dividend eligibility note (financially precise wording only) ─────

export function buildEligibilityNote(ticker: string, exDate: string | null, lang: "en" | "ko" = "en"): string | null {
  if (!exDate) return null;
  return lang === "ko"
    ? `${ticker}의 배당락일이 ${exDate}라면, 일반적으로 이 날짜 이전에 주식을 매수해야 해당 분배금을 받을 자격이 주어집니다.`
    : `If ${ticker}'s ex-dividend date is ${exDate}, investors generally need to purchase shares before the ex-dividend date to be eligible for that distribution.`;
}

// ── FAQ ───────────────────────────────────────────────────────────────────

function buildSummaryQuestion(
  ticker: string,
  resolved: ResolvedNextDividend,
  lang: "en" | "ko"
): NextDividendFaqItem | null {
  const { isOfficial, amount, exDate, payDate } = resolved;
  if (amount == null && !exDate) return null;

  if (isOfficial && amount != null) {
    return {
      question: lang === "ko" ? `${ticker}의 다음 배당은 언제인가요?` : `When is ${ticker}'s next dividend?`,
      answer:
        lang === "ko"
          ? `${ticker}의 다음 배당은 주당 $${amount.toFixed(4)}로 공식 발표되었습니다.${exDate ? ` 배당락일은 ${exDate}` : ""}${payDate ? `, 지급일은 ${payDate}입니다.` : "."}`
          : `${ticker}'s next dividend has been officially declared at $${amount.toFixed(4)} per share.${exDate ? ` The ex-dividend date is ${exDate}` : ""}${payDate ? `, and the payment date is ${payDate}.` : "."}`,
    };
  }

  if (amount != null) {
    return {
      question: lang === "ko" ? `${ticker}의 다음 배당은 언제인가요?` : `When is ${ticker}'s next dividend?`,
      answer:
        lang === "ko"
          ? `${ticker}의 다음 배당은${exDate ? ` ${exDate} 무렵으로 예상되며` : ""} CRADY는 현재 주당 약 $${amount.toFixed(4)}를 예상합니다. 아직 공식 발표된 금액은 아닙니다.`
          : `${ticker}'s next dividend is${exDate ? ` expected around ${exDate},` : ""} currently estimated by CRADY at approximately $${amount.toFixed(4)} per share. This has not yet been officially declared.`,
    };
  }

  return {
    question: lang === "ko" ? `${ticker}의 다음 배당은 언제인가요?` : `When is ${ticker}'s next dividend?`,
    answer:
      lang === "ko"
        ? `${ticker}의 다음 배당락일은 ${exDate}로 예상됩니다.`
        : `${ticker}'s next ex-dividend date is expected around ${exDate}.`,
  };
}

function buildDeclaredStatusQuestion(ticker: string, isOfficial: boolean, lang: "en" | "ko"): NextDividendFaqItem {
  return {
    question: lang === "ko" ? `${ticker}의 배당이 공식적으로 발표되었나요?` : `Has ${ticker}'s dividend been officially declared?`,
    answer: isOfficial
      ? lang === "ko"
        ? `예. 운용사가 이번 분배금을 공식적으로 발표했습니다.`
        : `Yes. The issuer has officially declared this distribution.`
      : lang === "ko"
        ? `아니요. 현재 표시된 금액은 CRADY의 예측치이며, 아직 공식 발표되지 않았습니다.`
        : `No. The amount currently shown is a CRADY estimate and has not yet been officially declared.`,
  };
}

export type NextDividendFaqInput = {
  ticker: string;
  exDate: string | null;
  payDate: string | null;
  declarationDate: string | null;
  pointEstimate: number | null;
  isOfficial: boolean;
  officialAmount: number | null;
};

/** The page's full FAQ bank: a leading "When is next dividend?" summary
 * question (broader than any single existing question), the same
 * ex-date/declare-date/how-much/why/payment-date items
 * buildNextDividendFaq already produces (unused elsewhere in the app today
 * — confirmed via repo search before reusing it here), plus an explicit
 * Yes/No declared-status question. Every answer traces to fields already
 * on the page; nothing here re-derives an estimate. */
export function buildNextDividendSeoFaq(input: NextDividendFaqInput, resolved: ResolvedNextDividend, lang: "en" | "ko" = "en"): NextDividendFaqItem[] {
  const items: NextDividendFaqItem[] = [];

  const summary = buildSummaryQuestion(input.ticker, resolved, lang);
  if (summary) items.push(summary);

  items.push(...buildNextDividendFaq(input, lang));
  items.push(buildDeclaredStatusQuestion(input.ticker, resolved.isOfficial, lang));

  return items;
}

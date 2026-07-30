import { providerLabel } from "@/lib/data";
import type { ArticleData } from "./data";
import type { ArticleTypeId, FaqItem } from "./types";

function fmtMoney(n: number | null | undefined, digits = 4): string {
  return n != null ? `$${n.toFixed(digits)}` : "not yet available";
}
function fmtPct(n: number | null | undefined, digits = 1): string {
  return n != null ? `${n.toFixed(digits)}%` : "not yet available";
}

/** Data-grounded FAQ per article type. Question sets are strictly
 * non-overlapping across the three types for the same ticker — yield and
 * payout-frequency questions live only on dividend-guide, risk-level
 * questions only on risk-analysis, next-dividend questions only on
 * next-dividend-prediction — so no two of a ticker's pages ever emit the
 * same FAQPage entry. Every answer is derived from the same ArticleData
 * used to render the page, so the JSON-LD is always accurate. */
export function buildFaqItems(data: ArticleData, type: ArticleTypeId): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf, changeFromLastPct } = data;

  if (type === "next-dividend-prediction") {
    return [
      {
        question: `When is the next ${ticker} dividend?`,
        answer: prediction?.target_pay_date
          ? `CRADY estimates the next ${ticker} dividend will be paid on ${prediction.target_pay_date}, with an ex-dividend date of ${prediction.target_ex_date ?? "TBD"}.`
          : `CRADY doesn't have enough recent data to estimate ${ticker}'s next dividend date yet. Check the distribution history section above for its past payment pattern.`,
      },
      {
        question: `What is the predicted ${ticker} dividend amount?`,
        answer: prediction?.predicted_amount != null
          ? `The estimated next ${ticker} dividend amount is ${fmtMoney(prediction.predicted_amount)} per share, based on its recent distribution history.`
          : `A predicted amount isn't available yet for ${ticker}.`,
      },
      {
        question: `How accurate is the CRADY prediction for ${ticker}?`,
        answer: prediction?.confidence_score != null
          ? `CRADY's current confidence score for this ${ticker} prediction is ${fmtPct(prediction.confidence_score, 0)}, based on the consistency of its recent distribution history and, when available, its officially announced payment schedule.`
          : `CRADY assigns a confidence score to each prediction based on distribution history consistency, but none is available for ${ticker} yet.`,
      },
      {
        question: `How is the next ${ticker} dividend estimated?`,
        answer: `CRADY estimates the next dividend by combining ${ticker}'s officially announced distribution schedule (when published by ${providerLabel(etf.provider_id)}) with a weighted average of its most recent actual payments. Estimates are never guessed for ETFs without enough payment history.`,
      },
      {
        question: `Has the ${ticker} dividend prediction changed recently?`,
        answer: prediction?.predicted_amount != null && changeFromLastPct != null
          ? `${ticker}'s currently predicted amount is ${changeFromLastPct >= 0 ? "up" : "down"} ${Math.abs(changeFromLastPct).toFixed(1)}% compared to its last actual payment.`
          : `There isn't enough data yet to compare ${ticker}'s predicted amount to its payment trend.`,
      },
    ];
  }

  if (type === "dividend-guide") {
    return [
      {
        question: `What is ${ticker}'s dividend yield?`,
        answer: annualYieldPct != null
          ? `${ticker}'s estimated annualized distribution yield is ${fmtPct(annualYieldPct)}, based on its trailing 90-day payment run-rate.`
          : `${ticker}'s dividend yield can't be estimated yet due to limited price or distribution data.`,
      },
      {
        question: `How often does ${ticker} pay dividends?`,
        answer: payoutFrequency
          ? `${ticker} pays distributions on a ${payoutFrequency} schedule.`
          : `${ticker}'s payout frequency hasn't been determined yet from its distribution history.`,
      },
      {
        question: `What does ${ticker} invest in?`,
        answer: etf.investment_strategy
          ? etf.investment_strategy
          : etf.asset_class
            ? `${ticker} is a ${providerLabel(etf.provider_id)} ${etf.asset_class} fund.`
            : `${ticker} is issued by ${providerLabel(etf.provider_id)}. See the overview above for available details.`,
      },
    ];
  }

  // risk-analysis
  return [
    {
      question: `Is ${ticker} a risky investment?`,
      answer: risk?.risk_level
        ? `CRADY classifies ${ticker} as ${risk.risk_level.toLowerCase()} risk, with a CRADY score of ${risk.crady_score?.toFixed(1) ?? "—"}/100. This reflects recent volatility and dividend stability, not a guarantee of future performance.`
        : `Risk data isn't available for ${ticker} yet.`,
    },
    {
      question: `How volatile is ${ticker}?`,
      answer: risk?.volatility_30d != null
        ? `${ticker}'s 30-day volatility is ${fmtPct(risk.volatility_30d)}${
            risk.max_drawdown != null ? `, with a recent maximum drawdown of ${fmtPct(risk.max_drawdown)}` : ""
          }.`
        : `Volatility data isn't available for ${ticker} yet.`,
    },
    {
      question: `How stable is ${ticker}'s dividend?`,
      answer: risk?.dividend_stability_score != null
        ? `${ticker} has a dividend stability score of ${risk.dividend_stability_score.toFixed(1)}/100, based on how consistent its distribution amount has been across recent payments.`
        : `Dividend stability data isn't available for ${ticker} yet.`,
    },
  ];
}

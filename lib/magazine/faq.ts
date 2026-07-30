import { providerLabel } from "@/lib/data";
import type { ArticleData } from "./data";
import type { ArticleTypeId, FaqItem } from "./types";

function fmtMoney(n: number | null | undefined, digits = 4): string {
  return n != null ? `$${n.toFixed(digits)}` : "not yet available";
}
function fmtPct(n: number | null | undefined, digits = 1): string {
  return n != null ? `${n.toFixed(digits)}%` : "not yet available";
}

/** Data-grounded FAQ per article type — every answer is derived from the
 * same ArticleData used to render the page, never a generic filler line,
 * so the FAQPage JSON-LD emitted from this array is always accurate. */
export function buildFaqItems(data: ArticleData, type: ArticleTypeId): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf } = data;
  const items: FaqItem[] = [];

  if (type === "next-dividend-prediction") {
    items.push({
      question: `When is the next ${ticker} dividend?`,
      answer: prediction?.target_pay_date
        ? `CRADY estimates the next ${ticker} dividend will be paid on ${prediction.target_pay_date}, with an ex-dividend date of ${prediction.target_ex_date ?? "TBD"}.`
        : `CRADY doesn't have enough recent data to estimate ${ticker}'s next dividend date yet. Check the distribution history section above for its past payment pattern.`,
    });
    items.push({
      question: `What is the predicted ${ticker} dividend amount?`,
      answer: prediction?.predicted_amount != null
        ? `The estimated next ${ticker} dividend amount is ${fmtMoney(prediction.predicted_amount)} per share, based on its recent distribution history.`
        : `A predicted amount isn't available yet for ${ticker}.`,
    });
    items.push({
      question: `How accurate is the CRADY prediction for ${ticker}?`,
      answer: prediction?.confidence_score != null
        ? `CRADY's current confidence score for this ${ticker} prediction is ${fmtPct(prediction.confidence_score, 0)}, based on the consistency of its recent distribution history and, when available, its officially announced payment schedule.`
        : `CRADY assigns a confidence score to each prediction based on distribution history consistency, but none is available for ${ticker} yet.`,
    });
    items.push({
      question: `How is the next ${ticker} dividend estimated?`,
      answer: `CRADY estimates the next dividend by combining ${ticker}'s officially announced distribution schedule (when published by ${providerLabel(etf.provider_id)}) with a weighted average of its most recent actual payments. Estimates are never guessed for ETFs without enough payment history.`,
    });
  }

  if (type === "dividend-guide" || type === "next-dividend-prediction") {
    items.push({
      question: `What is ${ticker}'s dividend yield?`,
      answer: annualYieldPct != null
        ? `${ticker}'s estimated annualized distribution yield is ${fmtPct(annualYieldPct)}, based on its trailing 90-day payment run-rate.`
        : `${ticker}'s dividend yield can't be estimated yet due to limited price or distribution data.`,
    });
    items.push({
      question: `How often does ${ticker} pay dividends?`,
      answer: payoutFrequency
        ? `${ticker} pays distributions on a ${payoutFrequency} schedule.`
        : `${ticker}'s payout frequency hasn't been determined yet from its distribution history.`,
    });
  }

  if (type === "risk-analysis" || type === "next-dividend-prediction") {
    items.push({
      question: `Is ${ticker} a risky investment?`,
      answer: risk?.risk_level
        ? `CRADY classifies ${ticker} as ${risk.risk_level.toLowerCase()} risk, with a CRADY score of ${risk.crady_score?.toFixed(1) ?? "—"}/100. This reflects recent volatility and dividend stability, not a guarantee of future performance.`
        : `Risk data isn't available for ${ticker} yet.`,
    });
  }

  if (type === "dividend-guide") {
    items.push({
      question: `Has ${ticker}'s dividend changed recently?`,
      answer: data.changeFromLastPct != null
        ? `${ticker}'s most recently predicted dividend is ${data.changeFromLastPct >= 0 ? "up" : "down"} ${Math.abs(data.changeFromLastPct).toFixed(1)}% compared to its last actual payment.`
        : `Recent trend data isn't available for ${ticker} yet.`,
    });
  }

  return items;
}

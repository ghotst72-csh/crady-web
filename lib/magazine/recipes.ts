import type { ArticleData } from "./data";
import type { ArticleTypeId, Section } from "./types";
import { buildFaqItems } from "./faq";
import {
  advantagesDisadvantagesSection,
  bestForSection,
  distributionHistorySection,
  distributionSummarySection,
  dividendStabilitySection,
  faqSection,
  fundInfoSection,
  investmentStrategySection,
  nextDividendHighlight,
  overviewSection,
  payoutFrequencySection,
  predictionReliabilityNote,
  recentTrendSection,
  riskAnalysisSection,
  yieldAnalysisSection,
} from "./sections";

export const ARTICLE_TYPE_SLUG: Record<ArticleTypeId, string> = {
  "next-dividend-prediction": "next-dividend-prediction",
  "dividend-guide": "dividend-guide",
  "risk-analysis": "risk-analysis",
};

function monthYear(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function articleSlug(ticker: string, type: ArticleTypeId): string {
  return `${ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG[type]}`;
}

export function buildArticleMeta(data: ArticleData, type: ArticleTypeId) {
  const { ticker, prediction, annualYieldPct } = data;
  const year = new Date().getUTCFullYear();

  if (type === "next-dividend-prediction") {
    const my = monthYear(prediction?.target_pay_date) ?? `${year}`;
    return {
      title: `${ticker} Next Dividend Prediction (${my}) | Expected Dividend Date & Forecast`,
      h1: `${ticker} Next Dividend Prediction`,
      description: `See the latest ${ticker} Next Dividend Prediction including expected ex-dividend date, payment date, estimated dividend amount, dividend yield, payout frequency, historical distributions and risk analysis.`,
    };
  }

  if (type === "dividend-guide") {
    return {
      title: `${ticker} Dividend Guide (${year}) | Yield, Distribution History & Analysis`,
      h1: `${ticker} Dividend Guide`,
      description: `A complete ${ticker} dividend guide covering distribution history, estimated yield${
        annualYieldPct != null ? ` (${annualYieldPct.toFixed(1)}%)` : ""
      }, payout frequency, and what to expect from future payments.`,
    };
  }

  return {
    title: `${ticker} Risk Analysis (${year}) | Volatility, CRADY Score & Dividend Stability`,
    h1: `${ticker} Risk Analysis`,
    description: `An in-depth ${ticker} risk analysis covering CRADY score, 30-day volatility, drawdown, and dividend stability to help you understand what drives its risk profile.`,
  };
}

/** The Section Library recipe for each article type — the whole point of
 * building sections as independent functions: a new article type is just a
 * new ordered list here, not new rendering code. */
export function buildSections(data: ArticleData, type: ArticleTypeId): Section[] {
  const faqItems = buildFaqItems(data, type);

  // Each section appears on exactly one article type — where a topic (risk,
  // yield, distribution history) is legitimately required on more than one
  // page, it gets a distinct presentation per page (predictionReliabilityNote
  // vs riskAnalysisSection; the highlight box's yield stat vs
  // yieldAnalysisSection's prose; distributionHistorySection's row table vs
  // distributionSummarySection's aggregate view) rather than reusing the same
  // rendered block, so no two of a ticker's three pages ever share verbatim
  // text.
  const bySlug: Record<ArticleTypeId, (Section | null)[]> = {
    "next-dividend-prediction": [
      nextDividendHighlight(data),
      distributionHistorySection(data),
      recentTrendSection(data),
      predictionReliabilityNote(data),
      faqSection(faqItems),
    ],
    "dividend-guide": [
      overviewSection(data),
      investmentStrategySection(data),
      yieldAnalysisSection(data),
      distributionSummarySection(data),
      payoutFrequencySection(data),
      fundInfoSection(data),
      faqSection(faqItems),
    ],
    "risk-analysis": [
      riskAnalysisSection(data),
      dividendStabilitySection(data),
      advantagesDisadvantagesSection(data),
      bestForSection(data),
      faqSection(faqItems),
    ],
  };

  return bySlug[type].filter((s): s is Section => s != null);
}

export { buildFaqItems };

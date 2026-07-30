import type { ArticleData } from "./data";
import type { ArticleTypeId, Section } from "./types";
import { buildFaqItems, buildFaqItemsKo } from "./faq";
import type { ComparisonPeer } from "@/lib/data";
import {
  advantagesDisadvantagesSection,
  bestForSection,
  comparisonTableSection,
  comparisonVerdictSection,
  distributionHistorySection,
  distributionSummarySection,
  dividendStabilitySection,
  faqSection,
  faqSectionKo,
  fundInfoSection,
  investmentStrategySection,
  nextDividendHighlight,
  overviewSection,
  paymentPatternSection,
  payoutFrequencySection,
  predictionReliabilityNote,
  recentTrendSection,
  riskAnalysisSection,
  upcomingScheduleSection,
  yearlyBreakdownSection,
  yieldAnalysisSection,
} from "./sections";

export const ARTICLE_TYPE_SLUG: Record<ArticleTypeId, string> = {
  "next-dividend-prediction": "next-dividend-prediction",
  "dividend-guide": "dividend-guide",
  "risk-analysis": "risk-analysis",
  "dividend-calendar": "dividend-calendar",
  "dividend-history": "dividend-history",
  comparison: "comparison",
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

export function buildArticleMeta(
  data: ArticleData,
  type: ArticleTypeId,
  extra?: { peer?: ComparisonPeer | null }
) {
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

  if (type === "risk-analysis") {
    return {
      title: `${ticker} Risk Analysis (${year}) | Volatility, CRADY Score & Dividend Stability`,
      h1: `${ticker} Risk Analysis`,
      description: `An in-depth ${ticker} risk analysis covering CRADY score, 30-day volatility, drawdown, and dividend stability to help you understand what drives its risk profile.`,
    };
  }

  if (type === "dividend-calendar") {
    return {
      title: `${ticker} Dividend Calendar (${year}) | Ex-Dividend & Payment Dates`,
      h1: `${ticker} Dividend Calendar`,
      description: `${ticker}'s upcoming ex-dividend and payment date calendar, based on ${ticker}'s officially published distribution schedule, plus how often ${ticker} pays and what to know before the ex-dividend date.`,
    };
  }

  if (type === "dividend-history") {
    return {
      title: `${ticker} Dividend History (${year}) | Past Payments by Year`,
      h1: `${ticker} Dividend History`,
      description: `${ticker}'s full recorded dividend history broken down by year, including total distributions paid, payment count, and how consistent its payment cadence has been.`,
    };
  }

  // comparison
  const peer = extra?.peer;
  const peerTicker = peer?.ticker ?? "Similar ETFs";
  return {
    title: `${ticker} vs ${peerTicker} (${year}) | Dividend ETF Comparison`,
    h1: `${ticker} vs ${peerTicker}`,
    description: `A side-by-side comparison of ${ticker} and ${peerTicker} covering estimated dividend yield, CRADY score, risk level, and payout frequency to help you decide between the two.`,
  };
}

/** The Section Library recipe for each article type — the whole point of
 * building sections as independent functions: a new article type is just a
 * new ordered list here, not new rendering code. */
export function buildSections(
  data: ArticleData,
  type: ArticleTypeId,
  extra?: { peer?: ComparisonPeer | null }
): Section[] {
  const faqItems = buildFaqItems(data, type, extra);
  const faqItemsKo = buildFaqItemsKo(data, type, extra);

  // Each section appears on exactly one article type — where a topic (risk,
  // yield, distribution history) is legitimately required on more than one
  // page, it gets a distinct presentation per page (predictionReliabilityNote
  // vs riskAnalysisSection; the highlight box's yield stat vs
  // yieldAnalysisSection's prose; distributionHistorySection's row table vs
  // distributionSummarySection's aggregate view vs yearlyBreakdownSection's
  // per-year table) rather than reusing the same rendered block, so no two
  // of a ticker's pages ever share verbatim text.
  const bySlug: Record<ArticleTypeId, (Section | null)[]> = {
    "next-dividend-prediction": [
      nextDividendHighlight(data),
      distributionHistorySection(data),
      recentTrendSection(data),
      predictionReliabilityNote(data),
      faqSection(faqItems),
      faqSectionKo(faqItemsKo),
    ],
    "dividend-guide": [
      overviewSection(data),
      investmentStrategySection(data),
      yieldAnalysisSection(data),
      distributionSummarySection(data),
      payoutFrequencySection(data),
      fundInfoSection(data),
      faqSection(faqItems),
      faqSectionKo(faqItemsKo),
    ],
    "risk-analysis": [
      riskAnalysisSection(data),
      dividendStabilitySection(data),
      advantagesDisadvantagesSection(data),
      bestForSection(data),
      faqSection(faqItems),
      faqSectionKo(faqItemsKo),
    ],
    "dividend-calendar": [
      upcomingScheduleSection(data),
      faqSection(faqItems),
      faqSectionKo(faqItemsKo),
    ],
    "dividend-history": [
      yearlyBreakdownSection(data),
      paymentPatternSection(data),
      faqSection(faqItems),
      faqSectionKo(faqItemsKo),
    ],
    comparison: extra?.peer
      ? [
          comparisonTableSection(data, extra.peer),
          comparisonVerdictSection(data, extra.peer),
          faqSection(faqItems),
          faqSectionKo(faqItemsKo),
        ]
      : [],
  };

  return bySlug[type].filter((s): s is Section => s != null);
}

export { buildFaqItems, buildFaqItemsKo };

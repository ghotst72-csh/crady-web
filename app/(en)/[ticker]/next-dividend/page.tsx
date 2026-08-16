import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllTickers, getEtf, getRiskMetrics } from "@/lib/data";
import {
  getFullNextPrediction,
  getNextScheduleRow,
  getRecentDeclaredDistributions,
} from "@/lib/ticker/nextDividendData";
import { buildNextDividendIntelligenceData } from "@/lib/ticker/buildNextDividendIntelligenceData";
import {
  getLatestOfficialDistributionForTicker,
  getPredictionVsOfficial,
  getEvaluatedPredictionHistory,
} from "@/lib/distributions/data";
import { getUnderlyingMomentum } from "@/lib/ticker/underlyingMomentum";
import {
  resolveNextDividend,
  buildWeekLabel,
  buildMonthLabel,
  buildOutlookArticle,
  buildEligibilityNote,
  buildNextDividendSeoFaq,
} from "@/lib/ticker/nextDividendSeoArticle";
import { articleSlug } from "@/lib/magazine/recipes";
import { buildArticleJsonLd, buildFaqJsonLd } from "@/lib/magazine/jsonld";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { NextDividendSeoPage } from "@/components/ticker/NextDividendSeoPage";
import { PageShell } from "@/components/layout/PageShell";
import { RESERVED_PATHS } from "@/lib/reserved";

export const revalidate = 3600;

type Params = { ticker: string };

function isKnown(v: string | null): v is string {
  return !!v && v.trim().toLowerCase() !== "unknown";
}

export async function generateStaticParams() {
  const tickers = await getAllTickers();
  return tickers.map((t) => ({ ticker: t.ticker.toLowerCase() }));
}

async function loadTicker(rawTicker: string) {
  if (RESERVED_PATHS.has(rawTicker.toLowerCase())) return null;
  const ticker = rawTicker.toUpperCase();
  const etf = await getEtf(ticker);
  if (!etf) return null;
  return { ticker, etf };
}

async function loadPageData(
  ticker: string,
  etfProviderId: string,
  etfPayoutFrequency: string | null,
  etfAssetClass: string | null
) {
  const [
    risk,
    fullNextPrediction,
    nextScheduleRow,
    recentDeclaredDistributions,
    officialDistribution,
    predictionVsOfficial,
    evaluatedPredictionHistory,
  ] = await Promise.all([
    getRiskMetrics(ticker),
    getFullNextPrediction(ticker),
    getNextScheduleRow(ticker),
    getRecentDeclaredDistributions(ticker, 12),
    getLatestOfficialDistributionForTicker(ticker),
    getPredictionVsOfficial(ticker),
    getEvaluatedPredictionHistory(ticker, 20),
  ]);

  const underlyingMomentum = risk?.underlying_ticker ? await getUnderlyingMomentum(risk.underlying_ticker) : null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const intelligence = buildNextDividendIntelligenceData({
    ticker,
    scheduleRow: nextScheduleRow,
    prediction: fullNextPrediction,
    recentDeclared: recentDeclaredDistributions,
    evaluatedHistory: evaluatedPredictionHistory,
    latestEvaluated: predictionVsOfficial,
    strategyType: risk?.strategy_type ?? null,
    underlyingTicker: risk?.underlying_ticker ?? null,
    assetClass: etfAssetClass,
    volatility30d: risk?.volatility_30d ?? null,
    payoutFrequency: etfPayoutFrequency,
    todayIso,
    lang: "en",
    underlyingVolatility30d: underlyingMomentum?.volatility_30d ?? null,
  });

  const resolved = resolveNextDividend({ ticker, intelligence, officialDistribution, todayIso });

  return { resolved, evaluatedPredictionHistory, trackRecord: intelligence.trackRecord };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const found = await loadTicker(rawTicker);
  if (!found) return {};
  const { ticker } = found;

  // Distinct search intent from /magazine/{ticker}-next-dividend-prediction
  // (that page is the longer evergreen guide — trend, comparison, risk
  // analysis; title "{ticker} Next Dividend Prediction"). This page is the
  // live, current-status snapshot, so its title/H1/description are
  // deliberately framed around "latest/current" rather than duplicating
  // the guide's own framing.
  const title = `${ticker} Next Dividend – Latest Prediction & Dates`;
  const description = `${ticker}'s current dividend status: the latest estimated or officially declared amount, announcement date, ex-dividend date, and payment date — updated automatically as new data arrives.`;

  const url = `https://crady.net/${ticker.toLowerCase()}/next-dividend`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ko: `https://crady.net/ko/${ticker.toLowerCase()}/next-dividend`,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "en_US",
      alternateLocale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function NextDividendSeoLandingPage({ params }: { params: Promise<Params> }) {
  const { ticker: rawTicker } = await params;
  if (rawTicker !== rawTicker.toLowerCase()) {
    permanentRedirect(`/${rawTicker.toLowerCase()}/next-dividend`);
  }

  const found = await loadTicker(rawTicker);
  if (!found) notFound();
  const { ticker, etf } = found;

  const payoutFrequency = isKnown(etf.payout_frequency) ? etf.payout_frequency : null;
  const assetClass = isKnown(etf.asset_class) ? etf.asset_class : null;
  const { resolved, evaluatedPredictionHistory, trackRecord } = await loadPageData(
    ticker,
    etf.provider_id,
    payoutFrequency,
    assetClass
  );

  const weekLabel =
    payoutFrequency?.toLowerCase() === "monthly" ? buildMonthLabel(resolved.exDate, "en") : buildWeekLabel(resolved.exDate, "en");

  const outlookParagraphs = buildOutlookArticle(
    { ticker, etfName: isKnown(etf.name) ? etf.name : null, providerId: etf.provider_id, resolved },
    "en"
  );
  const eligibilityNote = buildEligibilityNote(ticker, resolved.exDate, "en");
  const faqItems = buildNextDividendSeoFaq(
    {
      ticker,
      exDate: resolved.exDate,
      payDate: resolved.payDate,
      declarationDate: resolved.declarationDate,
      pointEstimate: resolved.isOfficial ? null : resolved.amount,
      isOfficial: resolved.isOfficial,
      officialAmount: resolved.isOfficial ? resolved.amount : null,
    },
    resolved,
    "en"
  );

  const url = `https://crady.net/${ticker.toLowerCase()}/next-dividend`;
  const headline = `${ticker} Next Dividend – Latest Prediction & Dates`;
  const description = `${ticker}'s current dividend status: the latest estimated or officially declared amount, announcement date, ex-dividend date, and payment date — updated automatically as new data arrives.`;
  const nowIso = new Date().toISOString();

  const articleJsonLd = buildArticleJsonLd({
    headline,
    description,
    url,
    datePublished: etf.created_at ?? nowIso,
    dateModified: nowIso,
  });
  const faqJsonLd = buildFaqJsonLd(faqItems);

  const magazineHref = `/magazine/${articleSlug(ticker, "next-dividend-prediction")}`;

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: ticker, url: `https://crady.net/${ticker.toLowerCase()}` },
          { name: "Next Dividend", url },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <NextDividendSeoPage
        ticker={ticker}
        etfName={isKnown(etf.name) ? etf.name : null}
        weekLabel={weekLabel}
        panelData={{
          amount: resolved.amount,
          isOfficial: resolved.isOfficial,
          confidence: resolved.confidence,
          announcementDate: resolved.declarationDate,
          exDate: resolved.exDate,
          payDate: resolved.payDate,
          previousAmount: resolved.previousAmount,
          changeFromLastPct: resolved.changeFromLastPct,
          whyTab: null,
        }}
        panelRange={resolved.expectedRange}
        outlookParagraphs={outlookParagraphs}
        eligibilityNote={eligibilityNote}
        faqItems={faqItems}
        trackRecord={trackRecord}
        evaluatedHistory={evaluatedPredictionHistory}
        ticketBasePath=""
        magazineHref={magazineHref}
        lang="en"
      />
    </PageShell>
  );
}

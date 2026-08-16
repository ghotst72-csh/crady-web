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
    lang: "ko",
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

  // 기존 /magazine/{ticker}-next-dividend-prediction(에버그린 가이드,
  // "{ticker} 다음 배당 예측" 제목)과 검색 의도를 분리 — 이 페이지는
  // "최신/현재" 상태 스냅샷이므로 제목·H1·설명을 그에 맞게 구성.
  const title = `${ticker} 다음 배당 – 최신 예측 및 일정`;
  const description = `${ticker}의 현재 배당 상태: 최신 예상 또는 공식 발표 금액, 발표일, 배당락일, 지급일을 확인하세요 — 새 데이터가 들어오면 자동으로 업데이트됩니다.`;

  const url = `https://crady.net/ko/${ticker.toLowerCase()}/next-dividend`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `https://crady.net/${ticker.toLowerCase()}/next-dividend`,
        ko: url,
        "x-default": `https://crady.net/${ticker.toLowerCase()}/next-dividend`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "ko_KR",
      alternateLocale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function NextDividendSeoLandingPageKo({ params }: { params: Promise<Params> }) {
  const { ticker: rawTicker } = await params;
  if (rawTicker !== rawTicker.toLowerCase()) {
    permanentRedirect(`/ko/${rawTicker.toLowerCase()}/next-dividend`);
  }

  const found = await loadTicker(rawTicker);
  if (!found) notFound();
  const { ticker, etf } = found;

  const payoutFrequency = isKnown(etf.payout_frequency) ? etf.payout_frequency : null;
  const assetClass = isKnown(etf.asset_class) ? etf.asset_class : null;
  const { resolved, evaluatedPredictionHistory, trackRecord } = await loadPageData(ticker, payoutFrequency, assetClass);

  const weekLabel =
    payoutFrequency?.toLowerCase() === "monthly" ? buildMonthLabel(resolved.exDate, "ko") : buildWeekLabel(resolved.exDate, "ko");

  const outlookParagraphs = buildOutlookArticle(
    { ticker, etfName: isKnown(etf.name) ? etf.name : null, providerId: etf.provider_id, resolved },
    "ko"
  );
  const eligibilityNote = buildEligibilityNote(ticker, resolved.exDate, "ko");
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
    "ko"
  );

  const url = `https://crady.net/ko/${ticker.toLowerCase()}/next-dividend`;
  const headline = `${ticker} 다음 배당 – 최신 예측 및 일정`;
  const description = `${ticker}의 현재 배당 상태: 최신 예상 또는 공식 발표 금액, 발표일, 배당락일, 지급일을 확인하세요 — 새 데이터가 들어오면 자동으로 업데이트됩니다.`;
  const nowIso = new Date().toISOString();

  const articleJsonLd = buildArticleJsonLd({
    headline,
    description,
    url,
    datePublished: etf.created_at ?? nowIso,
    dateModified: nowIso,
  });
  const faqJsonLd = buildFaqJsonLd(faqItems);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: ticker, url: `https://crady.net/ko/${ticker.toLowerCase()}` },
          { name: "다음 배당", url },
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
        ticketBasePath="/ko"
        magazineHref={null}
        lang="ko"
      />
    </PageShell>
  );
}

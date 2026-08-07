import type { Metadata } from "next";
import {
  getHomeSnapshot,
  getKeyMetrics,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
  nextDistributionsTimeline,
} from "@/lib/data";
import { getLatestAnnouncement, getDistributionRowsForAnnouncement, getDistributionTrustStats } from "@/lib/distributions/data";
import { getRecentChangeEvents } from "@/lib/activity/data";
import { buildHomeIntelligence } from "@/lib/home/intelligence";
import { buildWeeklyIntelligence } from "@/lib/home/weekly";
import { HomeIntelligence } from "@/components/home/HomeIntelligence";
import { WeeklyIntelligencePreview } from "@/components/home/WeeklyIntelligencePreview";
import { WatchlistIntelligence } from "@/components/etf/WatchlistIntelligence";
import { HeroSection } from "@/components/home/Hero";
import { TrustBar } from "@/components/home/TrustBar";
import { TodaysHighlights } from "@/components/home/TodaysHighlights";
import { MarketSummary } from "@/components/home/MarketSummary";
import { QuickInsights } from "@/components/home/QuickInsights";
import { NextDistributionsRail } from "@/components/NextDistributionsRail";
import { OfficialAnnouncementsPreview } from "@/components/home/OfficialAnnouncementsPreview";
import { RankingPreview } from "@/components/RankingPreview";
import { MagazineTeaser } from "@/components/home/MagazineTeaser";
import { AppPromoSection } from "@/components/AppPromoSection";
import { Suspense } from "react";
import { SitewideActivitySection } from "@/components/activity/SitewideActivitySection";
import { EtfCard } from "@/components/etf/EtfCard";
import { CardCarousel, CarouselItem } from "@/components/etf/CardCarousel";
import { WatchlistSection } from "@/components/etf/WatchlistSection";
import { snapshotToCardData } from "@/lib/etf/toCardData";

export const revalidate = 3600;

const TITLE = "CRADY — 배당 ETF 정보 플랫폼";
const DESCRIPTION =
  "YieldMax, Roundhill, Defiance 등 고배당 커버드콜 ETF의 배당 일정, 가격, CRADY 점수를 한눈에 확인하세요.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "https://crady.net/ko",
    languages: {
      en: "https://crady.net",
      ko: "https://crady.net/ko",
      "x-default": "https://crady.net",
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://crady.net/ko",
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function KoreanHomePage() {
  const [snapshot, keyMetrics, announcement, trustStats, changeEventsToday, changeEvents7d] = await Promise.all([
    getHomeSnapshot(),
    getKeyMetrics(),
    getLatestAnnouncement(),
    getDistributionTrustStats(),
    getRecentChangeEvents({ days: 1, lang: "ko" }),
    getRecentChangeEvents({ days: 7, lang: "ko" }),
  ]);
  const announcementRows = announcement ? await getDistributionRowsForAnnouncement(announcement.id) : [];

  const homeIntelligence = buildHomeIntelligence(snapshot, changeEventsToday, "ko");
  const weeklyIntelligence = buildWeeklyIntelligence(snapshot, changeEvents7d);

  const yieldTop10 = topByAnnualYield(snapshot, 10);
  const nextDistributions = nextDistributionsTimeline(snapshot, 10);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 6);
  const increasedTop = topRecentlyIncreased(snapshot, 6);
  const popularCards = topByCradyScoreSnapshot(snapshot, 6);
  const trendingCards = topRecentlyIncreased(snapshot, 6);
  const risingCount = snapshot.filter((e) => e.dividendTrend === "up").length;
  const lastUpdatedIso = snapshot.reduce<string | null>(
    (max, e) => (e.calculatedAt && (!max || e.calculatedAt > max) ? e.calculatedAt : max),
    null
  );
  const nextExDividend = snapshot
    .filter((e) => e.nextPredictedExDate != null)
    .sort((a, b) => (a.nextPredictedExDate! < b.nextPredictedExDate! ? -1 : 1))[0];
  const topPick = cradyTop[0]?.cradyScore != null ? { ticker: cradyTop[0].ticker, cradyScore: cradyTop[0].cradyScore } : null;

  return (
    <div>
      {/* Visually hidden — see the English homepage for the full rationale. */}
      <h1 className="sr-only">CRADY — YieldMax·커버드콜 ETF 배당 트래커</h1>

      {/* Phase 2 — see the English homepage for the full rationale;
          mirrored 1:1 with lang="ko". */}
      <NextDistributionsRail items={nextDistributions} lang="ko" basePath="/ko" />

      <HeroSection
        top10={yieldTop10}
        weekCount={keyMetrics.weekCount}
        nextExDividend={
          nextExDividend ? { ticker: nextExDividend.ticker, exDate: nextExDividend.nextPredictedExDate! } : null
        }
        topPick={topPick}
        lang="ko"
        basePath="/ko"
      />
      <TrustBar
        etfsTracked={snapshot.length}
        distributionRecords={trustStats.distributionRecords}
        announcementsTracked={trustStats.announcementsTracked}
        predictionCount={keyMetrics.nextPredictionCount}
        lastUpdatedIso={lastUpdatedIso}
        lang="ko"
      />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-4">
        <HomeIntelligence data={homeIntelligence} lang="ko" basePath="/ko" />
        <WatchlistIntelligence changeEventsToday={changeEventsToday} lang="ko" basePath="/ko" />
        <WatchlistSection snapshot={snapshot} lang="ko" />
      </section>

      <TodaysHighlights
        data={{
          announcementCount: announcement?.etf_count ?? null,
          announcementDate: announcement?.announcement_date ?? null,
          todayCount: keyMetrics.todayCount,
          weekCount: keyMetrics.weekCount,
          highestYieldTicker: yieldTop10[0]?.ticker ?? null,
          highestYieldPct: yieldTop10[0]?.annualYieldPct ?? null,
          risingCount,
        }}
        lang="ko"
        basePath="/ko"
      />

      <MarketSummary
        announcementRows={announcementRows}
        announcementCount={announcement?.etf_count ?? null}
        todayCount={keyMetrics.todayCount}
        weekCount={keyMetrics.weekCount}
        lang="ko"
        basePath="/ko"
      />

      <QuickInsights snapshot={snapshot} lang="ko" basePath="/ko" />

      {/* Phase 2 — trimmed from 5 carousels to 2; see the English homepage
          for the full rationale. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)] space-y-8">
        <CardCarousel title="인기 ETF" subtitle="현재 CRADY 점수가 가장 높은 ETF" viewAllHref="/ko/ranking" viewAllLabel="랭킹 보기 →">
          {popularCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="ko" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <CardCarousel title="트렌딩" subtitle="직전 지급 대비 분배금이 증가한 ETF" viewAllHref="/ko/ranking" viewAllLabel="랭킹 보기 →">
          {trendingCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="ko" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <WeeklyIntelligencePreview data={weeklyIntelligence} lang="ko" basePath="/ko" />
      </section>

      {announcement && (
        <OfficialAnnouncementsPreview
          announcement={announcement}
          rows={announcementRows}
          lang="ko"
          basePath="/ko"
        />
      )}

      <RankingPreview
        cradyTop={cradyTop}
        yieldTop={yieldTop10}
        increasedTop={increasedTop}
        lang="ko"
        basePath="/ko"
      />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
        <Suspense fallback={null}>
          <SitewideActivitySection lang="ko" />
        </Suspense>
      </section>

      <MagazineTeaser snapshot={snapshot} lang="ko" />

      <AppPromoSection lang="ko" />
    </div>
  );
}

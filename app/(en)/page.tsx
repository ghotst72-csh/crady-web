import type { Metadata } from "next";
import {
  getHomeSnapshot,
  getKeyMetrics,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
  topBySafety,
  nextDistributionsTimeline,
} from "@/lib/data";
import { getLatestAnnouncement, getDistributionRowsForAnnouncement, getDistributionTrustStats } from "@/lib/distributions/data";
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

const TITLE = "CRADY | High Dividend ETF Calendar & Distribution Tracker";
const DESCRIPTION =
  "Track YieldMax, Defiance, Roundhill and other high dividend ETFs with estimated distributions, payment calendar and rankings.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "https://crady.net",
    languages: {
      en: "https://crady.net",
      ko: "https://crady.net/ko",
      "x-default": "https://crady.net",
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://crady.net",
    type: "website",
    locale: "en_US",
    alternateLocale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function HomePage() {
  const [snapshot, keyMetrics, announcement, trustStats] = await Promise.all([
    getHomeSnapshot(),
    getKeyMetrics(),
    getLatestAnnouncement(),
    getDistributionTrustStats(),
  ]);
  const announcementRows = announcement ? await getDistributionRowsForAnnouncement(announcement.id) : [];

  const yieldTop10 = topByAnnualYield(snapshot, 10);
  const nextDistributions = nextDistributionsTimeline(snapshot, 10);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 6);
  const increasedTop = topRecentlyIncreased(snapshot, 6);
  const popularCards = topByCradyScoreSnapshot(snapshot, 6);
  const trendingCards = topRecentlyIncreased(snapshot, 6);
  const lowRiskCards = topBySafety(snapshot, 6);
  const recentlyDeclaredCards = snapshot
    .filter((e) => e.latestDividendDate != null)
    .sort((a, b) => (a.latestDividendDate! < b.latestDividendDate! ? 1 : -1))
    .slice(0, 6);
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
      {/* Visually hidden — every page needs exactly one <h1> describing its
          content; the Hero's own big number/ticker isn't a page title (it
          rotates per user interaction and per data refresh), so this
          restores correct document structure without changing the Hero's
          visual design (AI Overview Optimization Phase 1). */}
      <h1 className="sr-only">CRADY — YieldMax &amp; Covered Call ETF Dividend Tracker</h1>
      {/* Hero — one ETF, Bloomberg/FT-style, no carousel */}
      <HeroSection
        top10={yieldTop10}
        weekCount={keyMetrics.weekCount}
        nextExDividend={
          nextExDividend ? { ticker: nextExDividend.ticker, exDate: nextExDividend.nextPredictedExDate! } : null
        }
        topPick={topPick}
        lang="en"
      />
      <TrustBar
        etfsTracked={snapshot.length}
        distributionRecords={trustStats.distributionRecords}
        announcementsTracked={trustStats.announcementsTracked}
        predictionCount={keyMetrics.nextPredictionCount}
        lastUpdatedIso={lastUpdatedIso}
        lang="en"
      />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        <WatchlistSection snapshot={snapshot} lang="en" />
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
        lang="en"
      />

      <MarketSummary
        announcementRows={announcementRows}
        announcementCount={announcement?.etf_count ?? null}
        todayCount={keyMetrics.todayCount}
        weekCount={keyMetrics.weekCount}
        lang="en"
      />

      <QuickInsights snapshot={snapshot} lang="en" />

      <NextDistributionsRail items={nextDistributions} lang="en" />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)] space-y-8">
        <CardCarousel title="Popular ETFs" subtitle="Highest CRADY Score right now" viewAllHref="/ranking" viewAllLabel="View ranking →">
          {popularCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="en" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <CardCarousel title="Trending" subtitle="Distributions rising vs. last payment" viewAllHref="/ranking" viewAllLabel="View ranking →">
          {trendingCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="en" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <CardCarousel title="Recently Declared" subtitle="Most recent confirmed distribution" viewAllHref="/distributions" viewAllLabel="View calendar →">
          {recentlyDeclaredCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="en" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <CardCarousel title="High Income" subtitle="Highest annualized yield" viewAllHref="/ranking" viewAllLabel="View ranking →">
          {yieldTop10.slice(0, 6).map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="en" />
            </CarouselItem>
          ))}
        </CardCarousel>

        <CardCarousel title="Low Risk" subtitle="Highest dividend stability score" viewAllHref="/ranking" viewAllLabel="View ranking →">
          {lowRiskCards.map((etf) => (
            <CarouselItem key={etf.ticker}>
              <EtfCard data={snapshotToCardData(etf)} compact lang="en" />
            </CarouselItem>
          ))}
        </CardCarousel>
      </section>

      {announcement && (
        <OfficialAnnouncementsPreview announcement={announcement} rows={announcementRows} lang="en" />
      )}

      <RankingPreview cradyTop={cradyTop} yieldTop={yieldTop10} increasedTop={increasedTop} lang="en" />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
        <Suspense fallback={null}>
          <SitewideActivitySection lang="en" />
        </Suspense>
      </section>

      <MagazineTeaser snapshot={snapshot} lang="en" />

      <AppPromoSection lang="en" />
    </div>
  );
}

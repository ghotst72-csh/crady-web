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
  const [snapshot, keyMetrics, announcement, trustStats, changeEventsToday, changeEvents7d] = await Promise.all([
    getHomeSnapshot(),
    getKeyMetrics(),
    getLatestAnnouncement(),
    getDistributionTrustStats(),
    getRecentChangeEvents({ days: 1, lang: "en" }),
    getRecentChangeEvents({ days: 7, lang: "en" }),
  ]);
  const announcementRows = announcement ? await getDistributionRowsForAnnouncement(announcement.id) : [];

  // CRADY Intelligence 4.0, Items #3/#10/#13 — Home/Weekly/Watchlist
  // Intelligence, all built from the two change-event queries above plus
  // the already-fetched snapshot. Zero additional queries.
  const homeIntelligence = buildHomeIntelligence(snapshot, changeEventsToday, "en");
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
      {/* Visually hidden — every page needs exactly one <h1> describing its
          content; the Hero's own big number/ticker isn't a page title (it
          rotates per user interaction and per data refresh), so this
          restores correct document structure without changing the Hero's
          visual design (AI Overview Optimization Phase 1). */}
      <h1 className="sr-only">CRADY — YieldMax &amp; Covered Call ETF Dividend Tracker</h1>

      {/* Phase 2 — the site's primary message leads the page: CRADY
          predicts upcoming dividends before they're officially announced.
          Moved up from its old position (after QuickInsights, several
          screens down) to right after the h1 — spec §10's "a new visitor
          should understand within seconds" requirement. */}
      <NextDistributionsRail items={nextDistributions} lang="en" />

      {/* Today's highest-yield spotlight — still a real, useful module,
          now secondary to the prediction rail above it rather than the
          page's very first thing. */}
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

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-4">
        <HomeIntelligence data={homeIntelligence} lang="en" />
        <WatchlistIntelligence changeEventsToday={changeEventsToday} lang="en" />
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

      {/* Phase 2 — trimmed from 5 carousels to 2 (spec §1/§10: "a small
          number of strong sections," not "20 cards, 15 KPIs, several
          unrelated modules"). Popular/Trending are the two carousels most
          directly tied to CRADY's own prediction/stability scoring;
          Recently Declared, High Income and Low Risk were redundant with
          Ranking and the yield-focused Hero above. */}
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

        <WeeklyIntelligencePreview data={weeklyIntelligence} lang="en" />
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

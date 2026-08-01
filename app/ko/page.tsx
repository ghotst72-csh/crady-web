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

      <NextDistributionsRail items={nextDistributions} lang="ko" basePath="/ko" />

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

      <MagazineTeaser snapshot={snapshot} lang="ko" />

      <AppPromoSection lang="ko" />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  getHomeSnapshot,
  getThisWeekDividends,
  getKeyMetrics,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
  nextDistributionsTimeline,
} from "@/lib/data";
import { YieldCarousel } from "@/components/YieldCarousel";
import { NextDistributionsRail } from "@/components/NextDistributionsRail";
import { KeyMetrics } from "@/components/KeyMetrics";
import { WeekSchedule } from "@/components/WeekSchedule";
import { RankingPreview } from "@/components/RankingPreview";
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
  const [snapshot, thisWeek, keyMetrics] = await Promise.all([
    getHomeSnapshot(),
    getThisWeekDividends(5),
    getKeyMetrics(),
  ]);

  const yieldTop10 = topByAnnualYield(snapshot, 10);
  const nextDistributions = nextDistributionsTimeline(snapshot, 10);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 6);
  const increasedTop = topRecentlyIncreased(snapshot, 6);

  return (
    <div>
      <YieldCarousel top10={yieldTop10} lang="ko" basePath="/ko" />
      <NextDistributionsRail items={nextDistributions} lang="ko" basePath="/ko" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-2 pb-2">
        <Link href="/ko/distributions" className="text-sm text-[var(--crady-accent)] hover:underline font-medium">
          최신 공식 분배금 발표 보기 →
        </Link>
      </div>
      <KeyMetrics metrics={keyMetrics} lang="ko" basePath="/ko" />
      <WeekSchedule items={thisWeek} lang="ko" basePath="/ko" />
      <RankingPreview
        cradyTop={cradyTop}
        yieldTop={yieldTop10}
        increasedTop={increasedTop}
        lang="ko"
        basePath="/ko"
      />
      <AppPromoSection lang="ko" />
    </div>
  );
}

import type { Metadata } from "next";
import {
  getHomeSnapshot,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  nextDistributionsTimeline,
  toSearchIndex,
} from "@/lib/data";
import { getRecentAnnouncedDistributions } from "@/lib/distributions/data";
import { getRecentChangeEvents } from "@/lib/activity/data";
import { buildWeeklyIntelligence } from "@/lib/home/weekly";
import { WeeklyIntelligencePreview } from "@/components/home/WeeklyIntelligencePreview";
import { HeroSearch } from "@/components/home/HeroSearch";
import { QuickActions } from "@/components/home/QuickActions";
import { EtfTable, TickerCell, NameCell, ConfidenceBar } from "@/components/home/EtfTable";
import { RecentlyAnnouncedTable } from "@/components/home/RecentlyAnnouncedTable";
import { MagazineTeaser } from "@/components/home/MagazineTeaser";
import { AppPromoSection } from "@/components/AppPromoSection";
import { CalendarClock, TrendingUp, Target } from "lucide-react";

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
  const [snapshot, changeEvents7d, recentAnnounced] = await Promise.all([
    getHomeSnapshot(),
    getRecentChangeEvents({ days: 7, lang: "ko" }),
    getRecentAnnouncedDistributions(5),
  ]);

  const weeklyIntelligence = buildWeeklyIntelligence(snapshot, changeEvents7d);

  const yieldTop10 = topByAnnualYield(snapshot, 10);
  const nextDistributions = nextDistributionsTimeline(snapshot, 10);
  const predictionsTop = [...nextDistributions]
    .sort((a, b) => (b.nextPredictedConfidence ?? -1) - (a.nextPredictedConfidence ?? -1))
    .slice(0, 5);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 6);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-12">
        <HeroSearch
          searchIndex={toSearchIndex(snapshot)}
          popularTickers={cradyTop.slice(0, 5).map((e) => e.ticker)}
          lang="ko"
          basePath="/ko"
        />

        <QuickActions lang="ko" basePath="/ko" />

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EtfTable
            title="다음 분배금"
            icon={CalendarClock}
            viewAllHref="/calendar"
            viewAllLabel="캘린더 보기"
            rows={nextDistributions.slice(0, 5)}
            basePath="/ko"
            columns={[
              { header: "티커", render: (row) => <TickerCell row={row} basePath="/ko" /> },
              { header: "ETF 이름", render: (row) => <NameCell row={row} /> },
              { header: "배당락일", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedExDate ?? "—"}</span> },
              { header: "지급일", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedDate ?? "—"}</span> },
              { header: "금액", align: "right", render: (row) => <span className="font-semibold">{row.nextPredictedAmount != null ? `$${row.nextPredictedAmount.toFixed(4)}` : "—"}</span> },
              { header: "상태", align: "right", render: () => <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">예상</span> },
            ]}
          />
          <EtfTable
            title="최고 배당률"
            icon={TrendingUp}
            viewAllHref="/ranking"
            viewAllLabel="랭킹 보기"
            rows={yieldTop10.slice(0, 5)}
            basePath="/ko"
            columns={[
              { header: "티커", render: (row) => <TickerCell row={row} basePath="/ko" /> },
              { header: "ETF 이름", render: (row) => <NameCell row={row} /> },
              { header: "배당률 (TTM)", align: "right", render: (row) => <span className="font-semibold text-blue-700">{row.annualYieldPct != null ? `${row.annualYieldPct.toFixed(1)}%` : "—"}</span> },
              { header: "CRADY 점수", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.cradyScore != null ? row.cradyScore.toFixed(1) : "—"}</span> },
            ]}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EtfTable
            title="CRADY 예측"
            icon={Target}
            viewAllHref="/next-dividend"
            viewAllLabel="전체 보기"
            rows={predictionsTop}
            basePath="/ko"
            columns={[
              { header: "티커", render: (row) => <TickerCell row={row} basePath="/ko" /> },
              { header: "예측 금액", align: "right", render: (row) => <span className="font-semibold">{row.nextPredictedAmount != null ? `$${row.nextPredictedAmount.toFixed(4)}` : "—"}</span> },
              { header: "신뢰도", align: "right", render: (row) => <ConfidenceBar value={row.nextPredictedConfidence} /> },
              { header: "예상 지급일", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedDate ?? "—"}</span> },
            ]}
          />
          <RecentlyAnnouncedTable rows={recentAnnounced} lang="ko" basePath="/ko" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <MagazineTeaser snapshot={snapshot} lang="ko" />
          </div>
          <WeeklyIntelligencePreview data={weeklyIntelligence} lang="ko" basePath="/ko" />
        </div>
      </section>

      <AppPromoSection lang="ko" />
    </div>
  );
}

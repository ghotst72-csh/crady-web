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
  const [snapshot, changeEvents7d, recentAnnounced] = await Promise.all([
    getHomeSnapshot(),
    getRecentChangeEvents({ days: 7, lang: "en" }),
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
          lang="en"
        />

        <QuickActions lang="en" />

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EtfTable
            title="Next Distributions"
            icon={CalendarClock}
            viewAllHref="/calendar"
            viewAllLabel="View Calendar"
            rows={nextDistributions.slice(0, 5)}
            columns={[
              { header: "Ticker", render: (row) => <TickerCell row={row} /> },
              { header: "ETF Name", render: (row) => <NameCell row={row} /> },
              { header: "Ex-Date", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedExDate ?? "—"}</span> },
              { header: "Payment Date", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedDate ?? "—"}</span> },
              { header: "Amount", align: "right", render: (row) => <span className="font-semibold">{row.nextPredictedAmount != null ? `$${row.nextPredictedAmount.toFixed(4)}` : "—"}</span> },
              { header: "Status", align: "right", render: () => <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">Expected</span> },
            ]}
          />
          <EtfTable
            title="Highest Distribution Yields"
            icon={TrendingUp}
            viewAllHref="/ranking"
            viewAllLabel="View Rankings"
            rows={yieldTop10.slice(0, 5)}
            columns={[
              { header: "Ticker", render: (row) => <TickerCell row={row} /> },
              { header: "ETF Name", render: (row) => <NameCell row={row} /> },
              { header: "Yield (TTM)", align: "right", render: (row) => <span className="font-semibold text-blue-700">{row.annualYieldPct != null ? `${row.annualYieldPct.toFixed(1)}%` : "—"}</span> },
              { header: "CRADY Score", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.cradyScore != null ? row.cradyScore.toFixed(1) : "—"}</span> },
            ]}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EtfTable
            title="CRADY Predictions"
            icon={Target}
            viewAllHref="/next-dividend"
            viewAllLabel="View All"
            rows={predictionsTop}
            columns={[
              { header: "Ticker", render: (row) => <TickerCell row={row} /> },
              { header: "Predicted Amount", align: "right", render: (row) => <span className="font-semibold">{row.nextPredictedAmount != null ? `$${row.nextPredictedAmount.toFixed(4)}` : "—"}</span> },
              { header: "Confidence", align: "right", render: (row) => <ConfidenceBar value={row.nextPredictedConfidence} /> },
              { header: "Expected Payment", align: "right", render: (row) => <span className="text-[var(--gray-600)]">{row.nextPredictedDate ?? "—"}</span> },
            ]}
          />
          <RecentlyAnnouncedTable rows={recentAnnounced} lang="en" />
        </div>

        {/* Secondary content — kept visually smaller/quieter than the
            financial tables above, per the approved design's "tools and
            data first, editorial second" hierarchy. */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <MagazineTeaser snapshot={snapshot} lang="en" />
          </div>
          <WeeklyIntelligencePreview data={weeklyIntelligence} lang="en" />
        </div>
      </section>

      <AppPromoSection lang="en" />
    </div>
  );
}

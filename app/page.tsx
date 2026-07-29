import type { Metadata } from "next";
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

const TITLE = "CRADY | High Dividend ETF Calendar & Distribution Tracker";
const DESCRIPTION =
  "Track YieldMax, Defiance, Roundhill and other high dividend ETFs with estimated distributions, payment calendar and rankings.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://crady.net" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://crady.net",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function HomePage() {
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
      {/* A. Hero — one interactive carousel, #1 CRCO centered by default */}
      <YieldCarousel top10={yieldTop10} />

      {/* B. Next Estimated Distributions */}
      <NextDistributionsRail items={nextDistributions} />

      {/* C. Existing sections, repositioned below A/B */}
      <KeyMetrics metrics={keyMetrics} />
      <WeekSchedule items={thisWeek} />
      <RankingPreview
        cradyTop={cradyTop}
        yieldTop={yieldTop10}
        increasedTop={increasedTop}
      />

      {/* D. App promotion — the web's role is discovery, the app's role is
          ongoing management; this section hands off the funnel. */}
      <AppPromoSection />
    </div>
  );
}

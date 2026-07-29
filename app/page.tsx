import {
  getHomeSnapshot,
  getThisWeekDividends,
  getKeyMetrics,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
  nextDistributionsTimeline,
} from "@/lib/data";
import { YieldHeroTop10 } from "@/components/YieldHeroTop10";
import { NextDistributionsRail } from "@/components/NextDistributionsRail";
import { KeyMetrics } from "@/components/KeyMetrics";
import { WeekSchedule } from "@/components/WeekSchedule";
import { RankingPreview } from "@/components/RankingPreview";

export const revalidate = 3600;

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
      {/* A. Hero — 연환산 분배율 TOP 10, no intro text/search above it */}
      <YieldHeroTop10 top10={yieldTop10} />

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
    </div>
  );
}

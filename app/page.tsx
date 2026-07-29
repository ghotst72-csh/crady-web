import {
  getHomeSnapshot,
  getThisWeekDividends,
  getKeyMetrics,
  pickTodayHighlight,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
} from "@/lib/data";
import { TodayHighlight } from "@/components/TodayHighlight";
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

  const highlight = pickTodayHighlight(snapshot);
  const yieldTop = topByAnnualYield(snapshot, 6);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 6);
  const increasedTop = topRecentlyIncreased(snapshot, 6);

  const yieldLeader = yieldTop[0] ?? null;
  const cradyLeader = cradyTop[0] ?? null;

  return (
    <div>
      {/* A. 오늘의 핵심 */}
      {highlight && (
        <TodayHighlight
          highlight={highlight}
          yieldLeader={yieldLeader}
          cradyLeader={cradyLeader}
        />
      )}

      {/* B. 핵심 지표 요약 */}
      <KeyMetrics metrics={keyMetrics} />

      {/* C. 이번 주 배당 일정 */}
      <WeekSchedule items={thisWeek} />

      {/* D. 주요 랭킹 미리보기 (tabbed, replaces — not stacked) */}
      <RankingPreview
        cradyTop={cradyTop}
        yieldTop={yieldTop}
        increasedTop={increasedTop}
      />
    </div>
  );
}

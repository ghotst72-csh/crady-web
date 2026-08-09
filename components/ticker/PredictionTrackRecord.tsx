import type { TrackRecord } from "@/lib/ticker/nextDividendIntelligence";
import type { EvaluatedPredictionRow } from "@/lib/distributions/data";

/** CRADY Phase 2 §5 — "How close has CRADY been before?" promoted to its
 * own clearly-titled section right after the price/dividend visualization,
 * instead of buried behind an accordion.
 *
 * TEMPORARILY LOCKED (prediction-model recalibration in progress — see
 * prediction_model_audit.md in the C:\CRADY pipeline repo): the real
 * numbers this section used to show (within-15% count, average error, the
 * full per-prediction ForecastHistoryTimeline) are accurate but reflect a
 * prediction engine already known to underperform, and were undermining
 * the page before the engine is recalibrated. This is a display-only
 * change — getEvaluatedPredictionHistory/getPredictionVsOfficial, the
 * dividend_predictions table, and every historical row are untouched, and
 * the sitewide /prediction-accuracy trust page and internal audit tooling
 * still see real, unmasked numbers. Once the recalibrated model has enough
 * validated walk-forward history, restore the real trackRecord/rows
 * rendering below (ForecastHistoryTimeline.tsx is kept, just unused here
 * for now) rather than rebuilding it from scratch. */

const T = {
  title: { en: "Prediction Track Record", ko: "예측 정확도 기록" },
  lockedSubtitle: { en: "Historical prediction accuracy", ko: "과거 예측 정확도" },
  withinRange: { en: "Within target range", ko: "목표 범위 이내" },
  avgError: { en: "Average error", ko: "평균 오차" },
  comingSoon: { en: "Detailed prediction analytics coming soon.", ko: "상세 예측 분석은 곧 제공될 예정입니다." },
  empty: {
    en: "Not enough completed predictions yet to publish a track record for this ETF.",
    ko: "이 ETF에 대한 정확도 기록을 발행하기에 완료된 예측이 아직 충분하지 않습니다.",
  },
} as const;

export function PredictionTrackRecord({
  trackRecord,
  lang = "en",
}: {
  trackRecord: TrackRecord | null;
  rows: EvaluatedPredictionRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  return (
    <div id="prediction-history" className="scroll-mt-24">
      <div className="flex items-center gap-1.5">
        <h2 className="text-lg font-bold">{T.title[lang]}</h2>
        {trackRecord && (
          <span aria-hidden className="text-sm text-[var(--gray-400)]">
            🔒
          </span>
        )}
      </div>

      {trackRecord ? (
        <>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">{T.lockedSubtitle[lang]}</p>
          <div className="mt-3 border border-[var(--gray-200)] rounded-xl p-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <div className="text-3xl font-black tabular-nums leading-none text-[var(--gray-300)]">**/**</div>
              <div className="text-xs text-[var(--gray-500)] mt-1">{T.withinRange[lang]}</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums leading-none text-[var(--gray-300)]">**/**</div>
              <div className="text-xs text-[var(--gray-500)] mt-1">{T.avgError[lang]}</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--gray-400)]">{T.comingSoon[lang]}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      )}
    </div>
  );
}

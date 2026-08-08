import Link from "next/link";
import type { TrackRecord } from "@/lib/ticker/nextDividendIntelligence";
import type { EvaluatedPredictionRow } from "@/lib/distributions/data";
import { ForecastHistoryTimeline } from "./ForecastHistoryTimeline";
import { Tooltip } from "@/components/ui/Tooltip";
import { ICON } from "@/lib/ui/icons";

/** CRADY Phase 2 §5 — "How close has CRADY been before?" promoted to its
 * own clearly-titled section right after the price/dividend visualization,
 * instead of buried behind an accordion. Headline stat first (conclusion),
 * then the real per-prediction history (evidence) — never re-derives or
 * reinterprets past predictions, just surfaces the same trackRecord/
 * evaluatedPredictionHistory data the page already computes. */

const T = {
  title: { en: "Prediction Track Record", ko: "예측 정확도 기록" },
  subtitle: {
    en: "How CRADY's past next-dividend predictions compared to what was actually paid.",
    ko: "CRADY의 과거 다음 배당 예측이 실제 지급액과 얼마나 일치했는지 보여줍니다.",
  },
  withinRange: { en: "within 15% of actual", ko: "실제값과 15% 이내" },
  trackRecordTooltip: {
    en: "How many of CRADY's past predictions landed within 15% of the actual paid amount.",
    ko: "CRADY의 과거 예측 중 실제 지급액과 15% 이내로 맞은 비율입니다.",
  },
  avgError: { en: "Average Absolute Error", ko: "평균 절대 오차" },
  empty: {
    en: "Not enough completed predictions yet to publish a track record for this ETF.",
    ko: "이 ETF에 대한 정확도 기록을 발행하기에 완료된 예측이 아직 충분하지 않습니다.",
  },
  sitewide: { en: "See sitewide accuracy across all ETFs →", ko: "전체 ETF 사이트 정확도 보기 →" },
} as const;

export function PredictionTrackRecord({
  trackRecord,
  rows,
  lang = "en",
  basePath = "",
}: {
  trackRecord: TrackRecord | null;
  rows: EvaluatedPredictionRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  return (
    <div id="prediction-history" className="scroll-mt-24">
      <h2 className="text-lg font-bold">{T.title[lang]}</h2>
      <p className="text-sm text-[var(--gray-600)] mt-0.5">{T.subtitle[lang]}</p>

      {trackRecord ? (
        <div className="mt-3 border border-[var(--gray-200)] rounded-xl p-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <div className="text-3xl font-black tabular-nums leading-none">
              {trackRecord.withinRangeCount}/{trackRecord.count}
            </div>
            <div className="text-xs text-[var(--gray-500)] mt-1 flex items-center">
              {T.withinRange[lang]}
              <Tooltip text={T.trackRecordTooltip[lang]} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">
              {trackRecord.averageAbsoluteErrorPct.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--gray-500)] mt-1 flex items-center">
              <span aria-hidden className="mr-1">{ICON.predictionAccuracy}</span>
              {T.avgError[lang]}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-3">
          <ForecastHistoryTimeline rows={rows} lang={lang} />
        </div>
      )}

      <Link
        href={`${basePath}/prediction-accuracy`}
        className="mt-3 inline-flex items-center text-sm font-semibold text-indigo-600 hover:underline"
      >
        {T.sitewide[lang]}
      </Link>
    </div>
  );
}

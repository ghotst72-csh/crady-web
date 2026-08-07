import Link from "next/link";
import type { SiteAccuracySummary, TickerAccuracyRow } from "@/lib/accuracy/siteAccuracy";

/** CRADY Phase 2 §11 — the Prediction Accuracy trust page. Every number
 * comes from real, pipeline-evaluated predictions (see
 * lib/accuracy/siteAccuracy.ts); nothing here is a headline stat invented
 * to look impressive — the real sitewide average error is shown as-is,
 * including when it isn't flattering. */

const T = {
  title: { en: "Prediction Accuracy", ko: "예측 정확도" },
  intro: {
    en: "How CRADY's next-dividend predictions have compared to what ETFs actually paid, based on every real, resolved prediction the pipeline has evaluated so far.",
    ko: "CRADY의 다음 배당 예측이 실제 지급액과 얼마나 일치했는지, 파이프라인이 지금까지 평가한 모든 실제 확정 예측을 기준으로 보여줍니다.",
  },
  evaluatedCount: { en: "Evaluated Predictions", ko: "평가된 예측 수" },
  tickerCount: { en: "ETFs Covered", ko: "적용 ETF 수" },
  avgError: { en: "Average Absolute Error", ko: "평균 절대 오차" },
  medianError: { en: "Median Absolute Error", ko: "중앙값 절대 오차" },
  withinTitle: { en: "Predictions Within Error Range", ko: "오차 범위 내 예측 비율" },
  within10: { en: "Within 10%", ko: "10% 이내" },
  within15: { en: "Within 15%", ko: "15% 이내" },
  within25: { en: "Within 25%", ko: "25% 이내" },
  statusTitle: { en: "Evaluation Breakdown", ko: "평가 등급 분포" },
  statusNote: {
    en: "CRADY's own pipeline classification for how close each resolved prediction landed — not a separate metric invented for this page.",
    ko: "각 확정 예측이 실제값에 얼마나 가까웠는지에 대한 CRADY 파이프라인 자체의 분류입니다 — 이 페이지를 위해 별도로 만든 지표가 아닙니다.",
  },
  matched: { en: "Matched", ko: "일치" },
  close: { en: "Close", ko: "근접" },
  highError: { en: "High Error", ko: "오차 큼" },
  perTickerTitle: { en: "Accuracy by ETF", ko: "ETF별 정확도" },
  perTickerNote: {
    en: "Only ETFs with at least 3 resolved predictions are listed — a single lucky or unlucky guess isn't a track record.",
    ko: "확정된 예측이 3회 이상인 ETF만 표시됩니다 — 단 한 번의 결과만으로는 신뢰할 수 있는 기록이라 할 수 없습니다.",
  },
  colTicker: { en: "ETF", ko: "ETF" },
  colCount: { en: "Evaluated", ko: "평가 횟수" },
  colAvgError: { en: "Avg. Absolute Error", ko: "평균 절대 오차" },
  methodologyTitle: { en: "Methodology", ko: "산출 방식" },
  methodology: {
    en: "Each evaluated row compares CRADY's predicted per-share distribution against the officially paid amount for the same real payment date. Error is computed once an ETF's payment has actually occurred and been confirmed — never estimated in advance. Predictions still pending (no official payment yet) are not included in these figures.",
    ko: "각 평가 데이터는 CRADY가 예측한 주당 분배금과 동일한 실제 지급일에 공식적으로 지급된 금액을 비교합니다. 오차는 해당 ETF의 지급이 실제로 이루어지고 확정된 이후에만 계산되며, 사전에 추정하지 않습니다. 아직 지급 전인(공식 지급이 확인되지 않은) 예측은 이 수치에 포함되지 않습니다.",
  },
  emptyTitle: { en: "Not enough resolved predictions yet", ko: "아직 확정된 예측이 충분하지 않습니다" },
  empty: {
    en: "CRADY publishes accuracy figures once enough predictions have been resolved against real, official payments. Check back soon.",
    ko: "CRADY는 실제 공식 지급액과 비교할 수 있는 예측이 충분히 쌓이면 정확도 수치를 공개합니다. 곧 다시 확인해 주세요.",
  },
  viewEtf: { en: "View →", ko: "보기 →" },
  na: "—",
} as const;

function fmtPct(n: number | null): string {
  return n != null ? `${n.toFixed(1)}%` : T.na;
}

export function PredictionAccuracyReport({
  summary,
  tickerRows,
  lang = "en",
  basePath = "",
}: {
  summary: SiteAccuracySummary;
  tickerRows: TickerAccuracyRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  if (summary.evaluatedCount === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight">{T.title[lang]}</h1>
        <div className="mt-6 border border-[var(--gray-200)] rounded-xl p-6 text-center">
          <div className="font-bold">{T.emptyTitle[lang]}</div>
          <p className="mt-1.5 text-sm text-[var(--gray-500)]">{T.empty[lang]}</p>
        </div>
      </div>
    );
  }

  const total = summary.statusCounts.matched + summary.statusCounts.close + summary.statusCounts.high_error;
  const statusPct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-black tracking-tight">{T.title[lang]}</h1>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed max-w-2xl">{T.intro[lang]}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat label={T.evaluatedCount[lang]} value={String(summary.evaluatedCount)} />
        <SummaryStat label={T.tickerCount[lang]} value={String(summary.tickerCount)} />
        <SummaryStat label={T.avgError[lang]} value={fmtPct(summary.averageAbsoluteErrorPct)} accent />
        <SummaryStat label={T.medianError[lang]} value={fmtPct(summary.medianAbsoluteErrorPct)} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">{T.withinTitle[lang]}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <RangeStat label={T.within10[lang]} count={summary.withinRangeCounts.within10} total={summary.evaluatedCount} />
          <RangeStat label={T.within15[lang]} count={summary.withinRangeCounts.within15} total={summary.evaluatedCount} />
          <RangeStat label={T.within25[lang]} count={summary.withinRangeCounts.within25} total={summary.evaluatedCount} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">{T.statusTitle[lang]}</h2>
        <p className="text-xs text-[var(--gray-500)] mt-0.5">{T.statusNote[lang]}</p>
        <div className="mt-3 flex h-3 rounded-full overflow-hidden border border-[var(--gray-200)]">
          <div style={{ width: `${statusPct(summary.statusCounts.matched)}%` }} className="bg-emerald-500" />
          <div style={{ width: `${statusPct(summary.statusCounts.close)}%` }} className="bg-[var(--crady-accent)]" />
          <div style={{ width: `${statusPct(summary.statusCounts.high_error)}%` }} className="bg-red-500" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--gray-600)]">
          <LegendItem color="bg-emerald-500" label={T.matched[lang]} count={summary.statusCounts.matched} />
          <LegendItem color="bg-[var(--crady-accent)]" label={T.close[lang]} count={summary.statusCounts.close} />
          <LegendItem color="bg-red-500" label={T.highError[lang]} count={summary.statusCounts.high_error} />
        </div>
      </div>

      {tickerRows.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold">{T.perTickerTitle[lang]}</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">{T.perTickerNote[lang]}</p>
          <div className="mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">{T.colTicker[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colCount[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colAvgError[lang]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {tickerRows.map((r) => (
                    <tr key={r.ticker} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`${basePath}/${r.ticker.toLowerCase()}`} className="font-bold hover:underline">
                          {r.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--gray-600)]">{r.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtPct(r.averageAbsoluteErrorPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-[var(--gray-200)] pt-6">
        <h2 className="text-sm font-bold">{T.methodologyTitle[lang]}</h2>
        <p className="mt-1.5 text-xs text-[var(--gray-500)] leading-relaxed">{T.methodology[lang]}</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3">
      <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className={`mt-1 text-xl font-black tabular-nums ${accent ? "text-[#92400e]" : ""}`}>{value}</div>
    </div>
  );
}

function RangeStat({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3 text-center">
      <div className="text-2xl font-black tabular-nums">{pct.toFixed(0)}%</div>
      <div className="text-[11px] text-[var(--gray-500)] mt-0.5">{label}</div>
      <div className="text-[10px] text-[var(--gray-400)] mt-0.5">
        {count}/{total}
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label} <strong className="tabular-nums text-black">{count}</strong>
    </span>
  );
}

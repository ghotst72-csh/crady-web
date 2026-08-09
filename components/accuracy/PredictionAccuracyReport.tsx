import type { SiteAccuracySummary, TickerAccuracyRow } from "@/lib/accuracy/siteAccuracy";

/** CRADY Phase 2 §11 — the Prediction Accuracy trust page.
 *
 * TEMPORARILY LOCKED (prediction-model recalibration in progress — see
 * prediction_model_audit.md / the Prediction Engine 2.0 report in the
 * C:\CRADY pipeline repo): the audit established that these real,
 * pipeline-evaluated numbers describe a prediction engine
 * (dividend_predictions, mixed v0.2-v0.5) that is disconnected from the
 * model actually generating the live public "Next Dividend" estimate
 * (next_predictions/trend_v1) — the accuracy this page reports isn't the
 * accuracy of the number users see elsewhere on the site. Locking the
 * performance figures here (same treatment as
 * components/ticker/PredictionTrackRecord.tsx) until a recalibrated
 * engine's own walk-forward-validated accuracy can be shown here instead.
 * Display-only: computeSiteAccuracy/computeTickerAccuracy and every
 * historical row are untouched — only what this component renders
 * changed. */

const T = {
  title: { en: "Prediction Accuracy", ko: "예측 정확도" },
  intro: {
    en: "How CRADY's next-dividend predictions have compared to what ETFs actually paid, based on every real, resolved prediction the pipeline has evaluated so far.",
    ko: "CRADY의 다음 배당 예측이 실제 지급액과 얼마나 일치했는지, 파이프라인이 지금까지 평가한 모든 실제 확정 예측을 기준으로 보여줍니다.",
  },
  lockedTitle: { en: "Historical prediction performance", ko: "과거 예측 성능" },
  lockedBody: { en: "Available soon.", ko: "곧 제공될 예정입니다." },
  evaluatedCount: { en: "Evaluated Predictions", ko: "평가된 예측 수" },
  tickerCount: { en: "ETFs Covered", ko: "적용 ETF 수" },
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
} as const;

export function PredictionAccuracyReport({
  summary,
  lang = "en",
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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="flex items-center gap-1.5">
        <h1 className="text-2xl font-black tracking-tight">{T.title[lang]}</h1>
        <span aria-hidden className="text-[var(--gray-400)]">
          🔒
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed max-w-2xl">{T.intro[lang]}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm">
        <SummaryStat label={T.evaluatedCount[lang]} value={String(summary.evaluatedCount)} />
        <SummaryStat label={T.tickerCount[lang]} value={String(summary.tickerCount)} />
      </div>

      <div className="mt-8 border border-[var(--gray-200)] rounded-xl p-6 text-center">
        <div className="font-bold">{T.lockedTitle[lang]}</div>
        <p className="mt-1.5 text-sm text-[var(--gray-500)]">{T.lockedBody[lang]}</p>
      </div>

      <div className="mt-8 border-t border-[var(--gray-200)] pt-6">
        <h2 className="text-sm font-bold">{T.methodologyTitle[lang]}</h2>
        <p className="mt-1.5 text-xs text-[var(--gray-500)] leading-relaxed">{T.methodology[lang]}</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3">
      <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

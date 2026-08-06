import type { EvaluatedPredictionRow } from "@/lib/distributions/data";

const T = {
  title: { en: "Forecast History", ko: "예측 이력" },
  predicted: { en: "Predicted", ko: "예측" },
  official: { en: "Official", ko: "공식" },
  empty: { en: "Not enough resolved predictions yet to show a history.", ko: "아직 이력을 표시할 만큼 확정된 예측이 충분하지 않습니다." },
} as const;

const STATUS_COLOR: Record<string, string> = {
  matched: "text-emerald-700",
  close: "text-[var(--crady-accent)]",
  high_error: "text-red-700",
};

export function ForecastHistoryTimeline({ rows, lang = "en" }: { rows: EvaluatedPredictionRow[]; lang?: "en" | "ko" }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
        <div className="text-caption mb-2">{T.title[lang]}</div>
        <p className="text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.targetPayDate} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--gray-100)] last:border-0 pb-2 last:pb-0">
            <span className="text-[var(--gray-500)] text-xs w-24 shrink-0">{r.targetPayDate}</span>
            <span className="tabular-nums text-[var(--gray-600)]">
              {T.predicted[lang]} ${r.predictedAmount.toFixed(4)}
            </span>
            <span aria-hidden className="text-[var(--gray-300)]">→</span>
            <span className="tabular-nums font-semibold">
              {T.official[lang]} ${r.actualAmount.toFixed(4)}
            </span>
            <span className={`text-xs font-bold tabular-nums shrink-0 ${STATUS_COLOR[r.evaluationStatus] ?? "text-[var(--gray-400)]"}`}>
              {r.percentageError != null ? `${r.percentageError >= 0 ? "+" : ""}${r.percentageError.toFixed(1)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

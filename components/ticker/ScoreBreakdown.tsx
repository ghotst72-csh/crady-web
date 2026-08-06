import type { ScoreBreakdown as ScoreBreakdownType } from "@/lib/ticker/scoreExplain";
import { componentLabel, buildScoreNarrative } from "@/lib/ticker/scoreExplain";
import { HowCalculated } from "@/components/ui/HowCalculated";

const T = {
  title: { en: "Why this CRADY Score?", ko: "왜 이 CRADY 점수일까요?" },
  weight: { en: "weight", ko: "가중치" },
  riskPenalty: { en: "Risk Penalty", ko: "위험 패널티" },
  defaultUsed: { en: "default used — real data not yet available", ko: "기본값 사용 — 실제 데이터 아직 없음" },
} as const;

export function ScoreBreakdown({ breakdown, lang = "en" }: { breakdown: ScoreBreakdownType | null; lang?: "en" | "ko" }) {
  if (!breakdown) return null;
  const narrative = buildScoreNarrative(breakdown, lang);
  const sorted = [...breakdown.components].sort((a, b) => b.points - a.points);

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-xs text-[var(--gray-600)]">
              {componentLabel(c.key, lang)}
              {c.usedDefault && <span className="ml-1 text-[var(--gray-400)]">*</span>}
            </div>
            <div className="flex-1 h-2 rounded-full bg-[var(--gray-100)] overflow-hidden">
              <div
                className="h-full bg-[var(--crady-accent)]"
                style={{ width: `${Math.min(100, (c.points / (c.weightPct * 1)) * 100)}%` }}
              />
            </div>
            <div className="w-24 shrink-0 text-right text-xs font-bold tabular-nums">
              +{c.points.toFixed(1)} <span className="text-[var(--gray-400)] font-normal">({c.weightPct}% {T.weight[lang]})</span>
            </div>
          </div>
        ))}
        {breakdown.riskPenalty.points > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--gray-100)] text-xs">
            <span className="text-[var(--gray-600)]">
              {T.riskPenalty[lang]} ({breakdown.riskPenalty.riskLevel ?? "—"})
            </span>
            <span className="font-bold text-red-700 tabular-nums">−{breakdown.riskPenalty.points}</span>
          </div>
        )}
      </div>
      {breakdown.components.some((c) => c.usedDefault) && (
        <p className="mt-2 text-[11px] text-[var(--gray-400)]">* {T.defaultUsed[lang]}</p>
      )}
      <ul className="mt-3 space-y-1 text-sm text-[var(--gray-600)] list-disc pl-5">
        {narrative.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <HowCalculated
        formula="Dividend Stability ×35% + Recovery ×18% + Drawdown Quality ×17% + Volatility Quality ×12% + Trend ×10% + Momentum ×8% − Risk Penalty"
        dataSource={lang === "ko" ? "CRADY 데이터 파이프라인의 실제 위험 지표" : "CRADY's data pipeline's real risk metrics"}
        caveats={
          lang === "ko"
            ? "이 화면은 파이프라인의 실제 공식을 표시용으로 재현한 것입니다."
            : "This reproduces the pipeline's real formula for display — verified against live data."
        }
        lang={lang}
      />
    </div>
  );
}

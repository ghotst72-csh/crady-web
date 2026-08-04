import Link from "next/link";
import type { PortfolioAnalysis } from "@/lib/portfolio/analyze";

const T = {
  title: { en: "Portfolio Health", ko: "포트폴리오 건강도" },
  outOf100: { en: "/ 100", ko: "/ 100" },
  methodology: { en: "Methodology", ko: "산정 방식" },
  dataGap: {
    en: (n: number) => `${n} component${n === 1 ? "" : "s"} could not be scored due to missing data — excluded from this total, not scored as zero.`,
    ko: (n: number) => `${n}개 항목은 데이터 부족으로 점수를 산정하지 못해 이번 합계에서 제외되었습니다 (0점 처리가 아님).`,
  },
  componentLabels: {
    totalReturn: { en: "Total Return", ko: "총수익" },
    drawdownControl: { en: "Drawdown Control", ko: "낙폭 관리" },
    incomeStrength: { en: "Income Strength", ko: "인컴 강도" },
    incomeStability: { en: "Income Stability", ko: "인컴 안정성" },
    diversification: { en: "Diversification", ko: "분산도" },
    providerConcentration: { en: "Provider Concentration", ko: "운용사 집중도" },
    underlyingConcentration: { en: "Underlying Concentration", ko: "기초자산 집중도" },
    dataQuality: { en: "Data Quality", ko: "데이터 품질" },
  },
  noData: { en: "Not enough real data to compute a Health Score yet.", ko: "Health Score를 산정할 만큼 데이터가 충분하지 않습니다." },
} as const;

export function HealthScoreCard({ healthScore, lang = "en" }: { healthScore: PortfolioAnalysis["healthScore"]; lang?: "en" | "ko" }) {
  if (!healthScore) {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
        <div className="text-caption">{T.title[lang]}</div>
        <p className="mt-2 text-sm text-[var(--gray-400)]">{T.noData[lang]}</p>
      </div>
    );
  }

  const missing = healthScore.components.filter((c) => c.score == null).length;

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-caption">{T.title[lang]}</div>
        <Link href="/about#methodology" className="text-[11px] font-semibold text-[#92400e] hover:underline">
          {T.methodology[lang]}
        </Link>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-4xl font-black text-[var(--crady-accent)] tabular-nums">{healthScore.overall.toFixed(0)}</span>
        <span className="text-sm text-[var(--gray-400)]">{T.outOf100[lang]}</span>
      </div>

      <div className="mt-4 space-y-2">
        {healthScore.components.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-[var(--gray-600)]">{T.componentLabels[c.key][lang]}</span>
            {c.score != null ? (
              <>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--gray-100)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--crady-accent)]"
                    style={{ width: `${(c.score / c.weight) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
                  {((c.score / c.weight) * 100).toFixed(0)}
                </span>
              </>
            ) : (
              <span className="flex-1 text-xs text-[var(--gray-400)]">{lang === "ko" ? "데이터 없음" : "No data"}</span>
            )}
          </div>
        ))}
      </div>

      {missing > 0 && <p className="mt-3 text-[11px] text-[var(--gray-400)]">{T.dataGap[lang](missing)}</p>}
    </div>
  );
}

import type { Scenarios } from "@/lib/ticker/scenarios";
import { SCENARIO_DISCLAIMER } from "@/lib/ticker/scenarios";
import { HowCalculated } from "@/components/ui/HowCalculated";

const T = {
  title: { en: "Possible Scenarios", ko: "가능한 시나리오" },
  bull: { en: "Bull", ko: "낙관" },
  base: { en: "Base", ko: "기본" },
  bear: { en: "Bear", ko: "비관" },
} as const;

/** CRADY ETF Workspace subpage unification — condensed from three
 * equal-sized cards plus a paragraph per scenario into one compact row,
 * matching Summary's restrained density. The narrative text and formula
 * disclosure stay available (HowCalculated is already a collapsed-by-
 * default accordion), just not stacked as always-visible prose. */
export function ScenarioCards({ scenarios, lang = "en" }: { scenarios: Scenarios | null; lang?: "en" | "ko" }) {
  if (!scenarios) return null;

  const rows = [
    { key: "bull" as const, amount: scenarios.bull.amount, color: "text-emerald-700" },
    { key: "base" as const, amount: scenarios.base.amount, color: "text-[var(--gray-900)]" },
    { key: "bear" as const, amount: scenarios.bear.amount, color: "text-red-700" },
  ];

  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
      <div className="text-caption">{T.title[lang]}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">{T[r.key][lang]}</span>
            <span className={`text-lg font-bold tabular-nums ${r.color}`}>${r.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--gray-400)] leading-relaxed">{SCENARIO_DISCLAIMER[lang]}</p>
      <HowCalculated
        formula={lang === "ko" ? "최근 실제 지급 분배금의 표준편차를 기준 예상치에 대칭 적용" : "Standard deviation of recent actually-paid distributions, applied symmetrically around the base estimate"}
        dataSource={lang === "ko" ? "최근 실제 분배 이력" : "Recent actual distribution history"}
        lang={lang}
      />
    </div>
  );
}

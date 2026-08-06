import type { Scenarios } from "@/lib/ticker/scenarios";
import { buildScenarioNarrative, SCENARIO_DISCLAIMER } from "@/lib/ticker/scenarios";
import { HowCalculated } from "@/components/ui/HowCalculated";

const T = {
  title: { en: "Possible Scenarios", ko: "가능한 시나리오" },
  bull: { en: "Bull", ko: "낙관" },
  base: { en: "Base", ko: "기본" },
  bear: { en: "Bear", ko: "비관" },
} as const;

export function ScenarioCards({ scenarios, lang = "en" }: { scenarios: Scenarios | null; lang?: "en" | "ko" }) {
  if (!scenarios) return null;
  const narrative = buildScenarioNarrative(lang);

  const rows = [
    { key: "bull" as const, amount: scenarios.bull.amount, text: narrative.bull, color: "text-emerald-700" },
    { key: "base" as const, amount: scenarios.base.amount, text: narrative.base, color: "text-[var(--gray-900)]" },
    { key: "bear" as const, amount: scenarios.bear.amount, text: narrative.bear, color: "text-red-700" },
  ];

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <div className="grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-lg border border-[var(--gray-100)] p-3 text-center">
            <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">{T[r.key][lang]}</div>
            <div className={`mt-1 text-lg font-extrabold tabular-nums ${r.color}`}>${r.amount.toFixed(4)}</div>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-[var(--gray-600)]">
        {rows.map((r) => (
          <li key={r.key}>
            <span className={`font-semibold ${r.color}`}>{T[r.key][lang]}:</span> {r.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--gray-400)] leading-relaxed">{SCENARIO_DISCLAIMER[lang]}</p>
      <HowCalculated
        formula={lang === "ko" ? "최근 실제 지급 분배금의 표준편차를 기준 예상치에 대칭 적용" : "Standard deviation of recent actually-paid distributions, applied symmetrically around the base estimate"}
        dataSource={lang === "ko" ? "최근 실제 분배 이력" : "Recent actual distribution history"}
        lang={lang}
      />
    </div>
  );
}

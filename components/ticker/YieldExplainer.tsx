import type { YieldExplanation } from "@/lib/ticker/yieldExplain";
import { HowCalculated } from "@/components/ui/HowCalculated";

const T = {
  title: { en: "Why this yield?", ko: "왜 이 수익률일까요?" },
} as const;

export function YieldExplainer({ explanation, lang = "en" }: { explanation: YieldExplanation | null; lang?: "en" | "ko" }) {
  if (!explanation) return null;
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <p className="text-sm text-[var(--gray-700)]">{explanation.formula}</p>
      {explanation.factors.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {explanation.factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--gray-600)]">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--crady-accent)] shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      <HowCalculated
        formula={explanation.formula}
        dataSource={lang === "ko" ? "최근 90일 실제 지급 분배금 및 현재 가격" : "Trailing 90 days of actually-paid distributions and the current price"}
        lang={lang}
      />
    </div>
  );
}

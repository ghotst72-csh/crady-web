const T = {
  title: { en: "Daily Summary", ko: "일일 요약" },
  disclaimer: {
    en: "Generated from real, current data using fixed rules — not an AI model, and not investment advice.",
    ko: "실제 데이터를 규칙 기반으로 조합해 생성되었습니다 — AI 모델이 아니며 투자 조언이 아닙니다.",
  },
} as const;

export function AiDailySummary({ sentences, lang = "en" }: { sentences: string[]; lang?: "en" | "ko" }) {
  if (sentences.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-gradient-to-br from-white to-[var(--gray-50)] p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <p className="text-sm text-[var(--gray-700)] leading-relaxed">{sentences.join(" ")}</p>
      <p className="mt-2 text-[11px] text-[var(--gray-400)]">{T.disclaimer[lang]}</p>
    </div>
  );
}

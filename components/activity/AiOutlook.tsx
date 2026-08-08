import type { AiOutlook as AiOutlookData } from "@/lib/activity/aiOutlook";

const T = {
  heading: { en: "AI Outlook", ko: "AI 브리핑" },
  aiGenerated: { en: "AI Generated", ko: "AI 생성" },
  labels: {
    todaysOutlook: { en: "Today's Outlook", ko: "오늘의 전망" },
    bullCase: { en: "Bull Case", ko: "상승 요인" },
    bearCase: { en: "Bear Case", ko: "하락 요인" },
    biggestRisk: { en: "Biggest Risk", ko: "주요 리스크" },
    dividendConfidence: { en: "Dividend Confidence", ko: "배당 신뢰도" },
    whatInvestorsAreWatching: { en: "What Investors Are Watching", ko: "투자자들이 주목하는 것" },
    upcomingCatalyst: { en: "Upcoming Catalyst", ko: "다가오는 이벤트" },
  },
} as const;

const SUBSECTION_ORDER: (keyof AiOutlookData)[] = [
  "todaysOutlook",
  "bullCase",
  "bearCase",
  "biggestRisk",
  "dividendConfidence",
  "whatInvestorsAreWatching",
  "upcomingCatalyst",
];

/** A professional morning-briefing format, not a single paragraph — still
 * entirely rule-based (lib/activity/aiOutlook.ts), still reusing the site's
 * one established "this is AI-generated" visual signature
 * (border-l-4 border-[var(--crady-accent)], the same treatment
 * ProfileSnippet already uses), just organized into labeled subsections. */
export function AiOutlook({ outlook, lang = "en" }: { outlook: AiOutlookData; lang?: "en" | "ko" }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] border border-[var(--gray-300)] rounded-full px-2 py-0.5">
          {T.aiGenerated[lang]}
        </span>
      </div>
      <div className="border-l-4 border-[var(--crady-accent)] pl-4 space-y-3">
        {SUBSECTION_ORDER.map((key) => (
          <div key={key}>
            <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
              {T.labels[key][lang]}
            </div>
            <p className="text-sm text-[var(--gray-800)] leading-relaxed mt-0.5">{outlook[key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

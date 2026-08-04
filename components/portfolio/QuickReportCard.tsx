const T = {
  title: { en: "Quick Report", ko: "요약 리포트" },
} as const;

/** Rule-based, never model-generated — see lib/portfolio/quickReport.ts.
 * Same visual signature as the rest of the site's AI/automated-summary
 * content (ProfileSnippet, AiOutlook, KeyTakeaways): a left accent border,
 * not a boxed callout, so it reads as "generated from your real numbers,"
 * consistent with how the rest of CRADY marks this kind of content. */
export function QuickReportCard({ sentences, lang = "en" }: { sentences: string[]; lang?: "en" | "ko" }) {
  if (sentences.length === 0) return null;
  return (
    <div className="border-l-4 border-[var(--crady-accent)] pl-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <p className="text-sm text-[var(--gray-700)] leading-relaxed">{sentences.join(" ")}</p>
    </div>
  );
}

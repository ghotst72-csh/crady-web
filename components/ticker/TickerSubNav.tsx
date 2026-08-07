const T = {
  label: { en: "Sections", ko: "섹션" },
  overview: { en: "Overview", ko: "개요" },
  prediction: { en: "Prediction", ko: "예측" },
  history: { en: "History", ko: "내역" },
  risk: { en: "Risk & Score", ko: "리스크 & 점수" },
  activity: { en: "Activity", ko: "활동" },
} as const;

const ITEMS = [
  { key: "overview" as const, href: "#overview" },
  { key: "prediction" as const, href: "#next-dividend-intelligence" },
  { key: "history" as const, href: "#dividend-history" },
  { key: "risk" as const, href: "#etf-intelligence" },
  { key: "activity" as const, href: "#etf-activity" },
];

/** CRADY Site Architecture Phase 1, §10 — the ticker page's own local
 * navigation, structurally distinct from the global Sidebar/Drawer
 * (lib/navigation.ts): plain in-page anchors to real, already-existing
 * sections (next-dividend-intelligence, dividend-history, etf-intelligence,
 * etf-activity — the last of these two ids added this phase, no content
 * moved or rewritten). Deliberately simple — no scroll-spy active-state
 * tracking — since Phase 2 is where the ticker page itself gets a real
 * prediction-first redesign; this phase only needs the structural
 * separation between "site navigation" and "page navigation" to exist. */
export function TickerSubNav({ lang = "en" }: { lang?: "en" | "ko" }) {
  return (
    <nav
      aria-label={T.label[lang]}
      className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-[var(--gray-200)]"
    >
      <div className="mx-auto max-w-4xl flex gap-1 overflow-x-auto px-4 sm:px-6 py-2">
        {ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className="shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-black transition-colors whitespace-nowrap"
          >
            {T[item.key][lang]}
          </a>
        ))}
      </div>
    </nav>
  );
}

const T = {
  label: { en: "Sections", ko: "섹션" },
  overview: { en: "Overview", ko: "개요" },
  dividends: { en: "Dividends", ko: "배당금" },
  predictionHistory: { en: "Prediction History", ko: "예측 기록" },
} as const;

const ITEMS = [
  { key: "overview" as const, href: "#overview" },
  { key: "dividends" as const, href: "#dividends" },
  { key: "predictionHistory" as const, href: "#prediction-history" },
];

/** CRADY Phase 2 §7 — a restrained 3-tab local nav (Overview / Dividends /
 * Prediction History), replacing the earlier 5-tab version now that the
 * page itself has a real Dividend & Price History chart and a promoted
 * Prediction Track Record section to point to. Structurally distinct from
 * the global Sidebar/Drawer (lib/navigation.ts). No scroll-spy active-state
 * tracking — deliberately simple, per spec. */
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

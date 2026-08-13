import { BarChart3, Trophy, Shield, TrendingUp } from "lucide-react";

const T = {
  headline: { en: "Compare ETFs", ko: "ETF 비교" },
  subhead: {
    en: "Pick any two to five tickers to compare side by side — price performance, yield, CRADY Score, income, drawdown, and dividend stability. Find the stronger high-yield choice.",
    ko: "2~5개의 티커를 선택해 가격 성과, 배당률, CRADY 점수, 인컴, 낙폭, 배당 안정성을 나란히 비교하세요.",
  },
} as const;

const FEATURES = [
  {
    icon: BarChart3,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: { en: "Side-by-side comparison", ko: "나란히 비교" },
    body: { en: "Key metrics, perfectly aligned", ko: "핵심 지표를 한눈에" },
  },
  {
    icon: Trophy,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: { en: "CRADY Score", ko: "CRADY 점수" },
    body: { en: "Our proprietary rating", ko: "CRADY 고유 평가" },
  },
  {
    icon: Shield,
    color: "text-green-600",
    bg: "bg-green-50",
    title: { en: "Dividend stability", ko: "배당 안정성" },
    body: { en: "Consistency you can trust", ko: "신뢰할 수 있는 일관성" },
  },
  {
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: { en: "Performance & risk", ko: "성과와 리스크" },
    body: { en: "Returns with context", ko: "맥락이 있는 수익률" },
  },
] as const;

/** Hero + feature strip, matching the approved reference design. The
 * dual-chart graphic is purely decorative inline SVG (no real data, no
 * invented numbers) — same convention already used in the homepage
 * hero's ascending trend-line decoration. */
export function CompareHero({ lang = "en" }: { lang?: "en" | "ko" }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--gray-500)] mb-1">
            <BarChart3 size={14} className="text-blue-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--gray-900)]">{T.headline[lang]}</h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--gray-600)] max-w-xl">{T.subhead[lang]}</p>
        </div>

        <DualChartGraphic />
      </div>

      <div className="mt-6 pt-5 border-t border-blue-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title.en} className="flex items-center gap-2.5">
            <span className={`shrink-0 w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center`}>
              <f.icon size={17} className={f.color} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--gray-900)] leading-tight">{f.title[lang]}</div>
              <div className="text-xs text-[var(--gray-500)] leading-tight">{f.body[lang]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualChartGraphic() {
  return (
    <div className="hidden md:flex items-center gap-3 shrink-0" aria-hidden="true">
      <div className="w-28 h-20 rounded-xl border border-blue-200 bg-blue-50/80 p-2 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-blue-600">ETF A</span>
        <svg viewBox="0 0 100 40" width="100%" height="28" fill="none">
          <polyline points="0,32 20,24 40,28 60,14 80,18 100,4" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
        VS
      </span>
      <div className="w-28 h-20 rounded-xl border border-green-200 bg-green-50/80 p-2 flex flex-col justify-between">
        <span className="text-[10px] font-bold text-green-600">ETF B</span>
        <svg viewBox="0 0 100 40" width="100%" height="28" fill="none">
          <polyline points="0,30 20,26 40,18 60,20 80,10 100,6" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

import { TrendingUp, Percent, Trophy, DollarSign, ShieldAlert, CalendarClock, TriangleAlert } from "lucide-react";

const T = {
  heading: { en: "What You'll Compare", ko: "무엇을 비교하나요" },
  disclaimer: {
    en: "Past performance is not indicative of future results. High-yield ETFs involve risk. Do your own research.",
    ko: "과거 성과가 미래 결과를 보장하지 않습니다. 고배당 ETF는 위험을 수반합니다. 투자 전 반드시 직접 조사하세요.",
  },
} as const;

const METRICS = [
  {
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: { en: "Price Performance", ko: "가격 성과" },
    body: { en: "1M, 3M, 6M, YTD, 1Y, 3Y, 5Y total return", ko: "1개월, 3개월, 6개월, YTD, 1년, 3년, 5년 총수익률" },
  },
  {
    icon: Percent,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: { en: "Annualized Yield", ko: "연환산 배당률" },
    body: { en: "Trailing distribution yield", ko: "최근 분배율" },
  },
  {
    icon: Trophy,
    color: "text-green-600",
    bg: "bg-green-50",
    title: { en: "CRADY Score", ko: "CRADY 점수" },
    body: { en: "Our proprietary overall rating", ko: "CRADY 고유 종합 평가" },
  },
  {
    icon: DollarSign,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: { en: "Income", ko: "인컴" },
    body: { en: "Real distributions received per $10,000", ko: "$10,000당 실제 수령 분배금" },
  },
  {
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50",
    title: { en: "Drawdown", ko: "낙폭" },
    body: { en: "Max drawdown & risk over the period", ko: "기간 중 최대 낙폭 및 리스크" },
  },
  {
    icon: CalendarClock,
    color: "text-teal-600",
    bg: "bg-teal-50",
    title: { en: "Dividend Stability", ko: "배당 안정성" },
    body: { en: "Payment count & consistency", ko: "지급 횟수 및 일관성" },
  },
] as const;

export function CompareEmptyState({ lang = "en" }: { lang?: "en" | "ko" }) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-6 sm:p-8">
      <h2 className="text-xl font-black text-center text-[var(--gray-900)]">{T.heading[lang]}</h2>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {METRICS.map((m) => (
          <div key={m.title.en} className="rounded-xl bg-[var(--gray-50)] p-4 text-center">
            <span className={`inline-flex w-11 h-11 rounded-full ${m.bg} items-center justify-center`}>
              <m.icon size={20} className={m.color} aria-hidden="true" />
            </span>
            <div className="mt-2.5 text-sm font-bold text-[var(--gray-900)]">{m.title[lang]}</div>
            <p className="mt-0.5 text-xs text-[var(--gray-500)] leading-snug">{m.body[lang]}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <TriangleAlert size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
        <span>{T.disclaimer[lang]}</span>
      </div>
    </div>
  );
}

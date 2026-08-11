import Link from "next/link";
import type { WeeklyIntelligence } from "@/lib/home/weekly";

const T = {
  title: { en: "Weekly Intelligence", ko: "주간 인텔리전스" },
  subtitle: {
    en: "This week's distributions, score changes, and upcoming ex-dates across every tracked ETF.",
    ko: "이번 주 전체 추적 ETF의 분배, 점수 변동, 다가오는 배당락일을 한눈에 확인하세요.",
  },
  viewAll: { en: "View full report →", ko: "전체 보기 →" },
  distributions: { en: "Distributions", ko: "분배 발표" },
  scoreChanges: { en: "Score Changes", ko: "점수 변동" },
  upcoming: { en: "Upcoming Ex-Dates", ko: "예정된 배당락일" },
} as const;

export function WeeklyIntelligencePreview({ data, lang = "en", basePath = "" }: { data: WeeklyIntelligence; lang?: "en" | "ko"; basePath?: string }) {
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-5 h-full flex flex-col">
      <h2 className="text-sm font-bold text-[var(--gray-900)]">{T.title[lang]}</h2>
      <p className="text-xs text-[var(--gray-500)] mt-0.5">{T.subtitle[lang]}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xl font-black tabular-nums">{data.distributions.length}</div>
          <div className="text-[10px] text-[var(--gray-500)] leading-tight">{T.distributions[lang]}</div>
        </div>
        <div>
          <div className="text-xl font-black tabular-nums">{data.scoreChanges.length}</div>
          <div className="text-[10px] text-[var(--gray-500)] leading-tight">{T.scoreChanges[lang]}</div>
        </div>
        <div>
          <div className="text-xl font-black tabular-nums text-blue-600">{data.upcomingExDates.length}</div>
          <div className="text-[10px] text-[var(--gray-500)] leading-tight">{T.upcoming[lang]}</div>
        </div>
      </div>
      <Link href={`${basePath}/weekly-intelligence`} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">
        {T.viewAll[lang]}
      </Link>
    </div>
  );
}

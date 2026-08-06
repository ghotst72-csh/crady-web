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
    <section className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{T.title[lang]}</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5 max-w-md">{T.subtitle[lang]}</p>
        </div>
        <Link href={`${basePath}/weekly-intelligence`} className="text-xs font-semibold text-[#92400e] hover:underline shrink-0">
          {T.viewAll[lang]}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-black tabular-nums">{data.distributions.length}</div>
          <div className="text-[11px] text-[var(--gray-500)]">{T.distributions[lang]}</div>
        </div>
        <div>
          <div className="text-2xl font-black tabular-nums">{data.scoreChanges.length}</div>
          <div className="text-[11px] text-[var(--gray-500)]">{T.scoreChanges[lang]}</div>
        </div>
        <div>
          <div className="text-2xl font-black tabular-nums text-[var(--crady-accent)]">{data.upcomingExDates.length}</div>
          <div className="text-[11px] text-[var(--gray-500)]">{T.upcoming[lang]}</div>
        </div>
      </div>
    </section>
  );
}

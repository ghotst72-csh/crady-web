import Link from "next/link";
import type { Metadata } from "next";
import { getUpcomingDividends } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DividendStagePill } from "@/components/DividendLifecycle";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "배당 일정",
  description: "다가오는 배당 ETF 기준일 및 지급일 일정.",
  alternates: {
    canonical: "https://crady.net/ko/calendar",
    languages: {
      en: "https://crady.net/calendar",
      ko: "https://crady.net/ko/calendar",
      "x-default": "https://crady.net/calendar",
    },
  },
};

export default async function KoreanCalendarPage() {
  const upcoming = await getUpcomingDividends(60);

  const byDate = new Map<string, typeof upcoming>();
  for (const d of upcoming) {
    const key = d.pay_date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(d);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net/ko" },
          { name: "배당 일정", url: "https://crady.net/ko/calendar" },
        ]}
      />
      <h1 className="text-2xl font-bold">배당 일정</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1">
        지급일이 다가오는 배당 ETF {upcoming.length}건
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--gray-500)] border border-[var(--gray-200)] rounded-lg px-3 py-2">
        <span className="font-semibold text-[var(--gray-600)]">배당 흐름</span>
        <span>Ex-Date 예정 (매수 시 배당 대상)</span>
        <span>→</span>
        <span>지급 대기 (기준일 경과)</span>
        <span>→</span>
        <span>지급 완료</span>
      </div>

      <div className="mt-6 space-y-6">
        {Array.from(byDate.entries()).map(([date, items]) => (
          <div key={date}>
            <div className="text-sm font-semibold text-[var(--gray-500)] mb-2">
              {date}
            </div>
            <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
              {items.map((d, i) => (
                <Link
                  key={`${d.ticker}-${i}`}
                  href={`/ko/${d.ticker.toLowerCase()}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
                >
                  <span className="font-semibold">{d.ticker}</span>
                  <span className="text-sm text-[var(--gray-500)] hidden sm:inline">
                    기준일 {d.ex_date}
                  </span>
                  <span className="text-sm">
                    {d.amount != null ? `$${d.amount.toFixed(4)}` : "예정"}
                  </span>
                  <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} lang="ko" />
                </Link>
              ))}
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-[var(--gray-400)]">예정된 일정이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

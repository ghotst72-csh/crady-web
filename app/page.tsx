import Link from "next/link";
import {
  getTopByCradyScore,
  getUpcomingDividends,
  providerLabel,
} from "@/lib/data";

export const revalidate = 3600;

export default async function HomePage() {
  const [topEtfs, upcoming] = await Promise.all([
    getTopByCradyScore(6),
    getUpcomingDividends(6),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--gray-200)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            배당 ETF 정보를
            <br />
            한눈에 확인하세요.
          </h1>
          <p className="mt-4 text-[var(--gray-600)] max-w-xl text-base sm:text-lg">
            YieldMax · Roundhill · Defiance 고배당 ETF의 배당 일정, 가격,
            CRADY 점수를 무료로 제공합니다.
          </p>

          <form action="/search" className="mt-8 max-w-md">
            <div className="flex border border-[var(--gray-300)] rounded-lg overflow-hidden focus-within:border-black transition-colors">
              <input
                type="text"
                name="q"
                placeholder="티커 또는 ETF명 검색 (예: MSTY)"
                className="flex-1 px-4 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                className="px-5 bg-black text-white text-sm font-medium hover:bg-[var(--gray-900)]"
              >
                검색
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Top by CRADY score */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold">CRADY 점수 상위 ETF</h2>
          <Link
            href="/ranking"
            className="text-sm text-[var(--gray-500)] hover:text-black"
          >
            전체 랭킹 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {topEtfs.map((etf) => (
            <Link
              key={etf.ticker}
              href={`/${etf.ticker.toLowerCase()}`}
              className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors"
            >
              <div className="text-xs text-[var(--gray-500)]">
                {providerLabel(etf.provider_id)}
              </div>
              <div className="font-bold text-lg mt-0.5">{etf.ticker}</div>
              <div className="text-sm text-[var(--gray-600)] truncate">
                {etf.name}
              </div>
              {etf.crady_score != null && (
                <div className="mt-2 text-sm font-semibold text-[var(--crady-accent)]">
                  CRADY {etf.crady_score.toFixed(1)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming dividends */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 border-t border-[var(--gray-200)]">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold">다가오는 배당 일정</h2>
          <Link
            href="/calendar"
            className="text-sm text-[var(--gray-500)] hover:text-black"
          >
            전체 일정 보기 →
          </Link>
        </div>
        <div className="divide-y divide-[var(--gray-200)] border border-[var(--gray-200)] rounded-xl overflow-hidden">
          {upcoming.map((d, i) => (
            <Link
              key={`${d.ticker}-${d.pay_date}-${i}`}
              href={`/${d.ticker.toLowerCase()}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
            >
              <span className="font-semibold">{d.ticker}</span>
              <span className="text-sm text-[var(--gray-600)]">
                지급일 {d.pay_date}
              </span>
              <span className="text-sm">
                {d.amount != null ? `$${d.amount.toFixed(4)}` : "예정"}
              </span>
            </Link>
          ))}
          {upcoming.length === 0 && (
            <div className="px-4 py-6 text-sm text-[var(--gray-500)]">
              예정된 배당 일정이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

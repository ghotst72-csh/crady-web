import Link from "next/link";
import type { Metadata } from "next";
import { getUpcomingDividends, getKeyMetrics } from "@/lib/data";
import { getLatestAnnouncement } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DividendStagePill } from "@/components/DividendLifecycle";
import { CalendarSummary } from "@/components/calendar/CalendarSummary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dividend Calendar",
  description: "Upcoming ex-dividend and payment dates for high dividend ETFs.",
  alternates: {
    canonical: "https://crady.net/calendar",
    languages: {
      en: "https://crady.net/calendar",
      ko: "https://crady.net/ko/calendar",
      "x-default": "https://crady.net/calendar",
    },
  },
};

export default async function CalendarPage() {
  const [upcoming, keyMetrics, latestAnnouncement] = await Promise.all([
    getUpcomingDividends(60),
    getKeyMetrics(),
    getLatestAnnouncement(),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextExDividendRow =
    [...upcoming].filter((d) => d.ex_date >= todayStr).sort((a, b) => (a.ex_date < b.ex_date ? -1 : 1))[0] ??
    upcoming[0] ??
    null;

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
          { name: "Home", url: "https://crady.net" },
          { name: "Dividend Calendar", url: "https://crady.net/calendar" },
        ]}
      />
      <h1 className="text-2xl font-bold">Dividend Calendar</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1">
        {upcoming.length} high dividend ETFs with an upcoming payment date
      </p>

      <div className="mt-4">
        <CalendarSummary
          todayCount={keyMetrics.todayCount}
          weekCount={keyMetrics.weekCount}
          predictionCount={keyMetrics.nextPredictionCount}
          nextExDividend={nextExDividendRow ? { ticker: nextExDividendRow.ticker, exDate: nextExDividendRow.ex_date } : null}
          latestAnnouncement={
            latestAnnouncement
              ? { etfCount: latestAnnouncement.etf_count, date: latestAnnouncement.announcement_date }
              : null
          }
          lang="en"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--gray-500)] border border-[var(--gray-200)] rounded-lg px-3 py-2">
        <span className="font-semibold text-[var(--gray-600)]">Dividend Flow</span>
        <span>Upcoming Ex-Date (must hold shares to qualify)</span>
        <span>→</span>
        <span>Awaiting Payment (past ex-date)</span>
        <span>→</span>
        <span>Paid</span>
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
                  href={`/${d.ticker.toLowerCase()}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
                >
                  <span className="font-semibold">{d.ticker}</span>
                  <span className="text-sm text-[var(--gray-500)] hidden sm:inline">
                    Ex-Date {d.ex_date}
                  </span>
                  <span className="text-sm">
                    {d.amount != null ? `$${d.amount.toFixed(4)}` : "TBD"}
                  </span>
                  <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} lang="en" />
                </Link>
              ))}
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-[var(--gray-400)]">No upcoming dividends scheduled.</p>
        )}
      </div>
    </div>
  );
}

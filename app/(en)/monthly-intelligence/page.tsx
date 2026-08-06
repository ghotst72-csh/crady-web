import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot } from "@/lib/data";
import { getRecentChangeEvents } from "@/lib/activity/data";
import { buildWeeklyIntelligence, type WeeklyTicker } from "@/lib/home/weekly";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Monthly Intelligence — CRADY",
  description: "This month's distribution events, CRADY Score changes, upcoming ex-dates, and yield movers across every tracked ETF.",
  alternates: {
    canonical: "https://crady.net/monthly-intelligence",
    languages: {
      en: "https://crady.net/monthly-intelligence",
      ko: "https://crady.net/ko/monthly-intelligence",
      "x-default": "https://crady.net/monthly-intelligence",
    },
  },
};

function Section({ title, items, empty, basePath }: { title: string; items: WeeklyTicker[]; empty: string; basePath: string }) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold mb-3">
        {title} <span className="text-[var(--gray-400)] font-normal text-sm">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--gray-400)]">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item.ticker}-${i}`} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--gray-100)] last:border-0 pb-1.5 last:pb-0">
              <Link href={`${basePath}/${item.ticker.toLowerCase()}`} className="font-semibold hover:underline">
                {item.ticker}
              </Link>
              <span className="text-[var(--gray-600)] text-right">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MonthlyIntelligencePage() {
  const [snapshot, changeEvents30d] = await Promise.all([
    getHomeSnapshot(),
    getRecentChangeEvents({ days: 30, lang: "en" }),
  ]);
  const data = buildWeeklyIntelligence(snapshot, changeEvents30d, new Date(), 30);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Monthly Intelligence", url: "https://crady.net/monthly-intelligence" },
        ]}
      />
      <h1 className="text-2xl font-bold">Monthly Intelligence</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        Every section below is rule-based and computed from real, current data — never an LLM call. Sections with no
        real events this month show an honest empty state rather than a fabricated one.{" "}
        <Link href="/weekly-intelligence" className="underline hover:text-black">
          See the 7-day view →
        </Link>
      </p>

      <div className="mt-6 space-y-4">
        <Section title="Distributions" items={data.distributions} empty="No distribution events in the last 30 days." basePath="" />
        <Section title="Score Changes" items={data.scoreChanges} empty="No CRADY Score changes in the last 30 days." basePath="" />
        <Section title="Risk Changes" items={data.riskLevelChanges} empty="No risk classification changes in the last 30 days." basePath="" />
        <Section title="Prediction Changes" items={data.predictionChanges} empty="No prediction changes in the last 30 days." basePath="" />
        <Section title="Upcoming Ex-Dates" items={data.upcomingExDates} empty="No upcoming ex-dates in the next 30 days." basePath="" />
        <Section title="Highest Yield Changes" items={data.yieldMovers} empty="No notable distribution-yield movers this month." basePath="" />
      </div>
    </div>
  );
}

import Link from "next/link";
import type { WeeklyDividend } from "@/lib/data";

const T = {
  heading: { en: "This Week's Dividend Schedule", ko: "이번 주 배당 일정" },
  viewAll: { en: "View Full Calendar →", ko: "전체 배당 일정 보기 →" },
  empty: { en: "No dividends scheduled this week.", ko: "이번 주 예정된 배당이 없습니다." },
  scheduled: { en: "TBD", ko: "예정" },
} as const;

export function WeekSchedule({
  items,
  lang = "en",
  basePath = "",
}: {
  items: WeeklyDividend[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const grouped = new Map<string, WeeklyDividend[]>();
  for (const item of items) {
    if (!grouped.has(item.pay_date)) grouped.set(item.pay_date, []);
    grouped.get(item.pay_date)!.push(item);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        <Link
          href={`${basePath}/calendar`}
          className="text-sm text-[var(--gray-500)] hover:text-black"
        >
          {T.viewAll[lang]}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      ) : (
        <div className="border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)]">
          {[...grouped.entries()].map(([date, rows]) => (
            <div key={date} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="text-xs font-semibold text-[var(--gray-500)] w-20 shrink-0">
                {date.slice(5)}
              </span>
              <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1">
                {rows.map((r, i) => (
                  <Link
                    key={`${r.ticker}-${i}`}
                    href={`${basePath}/${r.ticker.toLowerCase()}`}
                    className="text-sm hover:underline flex items-baseline gap-1.5"
                  >
                    <span className="font-semibold">{r.ticker}</span>
                    <span className="text-[var(--gray-500)]">
                      {r.amount != null ? `$${r.amount.toFixed(4)}` : T.scheduled[lang]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

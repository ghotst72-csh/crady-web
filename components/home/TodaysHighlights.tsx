import Link from "next/link";

const T = {
  heading: { en: "Today's Highlights", ko: "오늘의 하이라이트" },
  sub: {
    en: "What changed today — computed directly from the database, not written by hand.",
    ko: "오늘 바뀐 것들 — 직접 작성한 문구가 아니라 데이터베이스에서 그대로 계산한 값입니다.",
  },
  announced: {
    en: (count: number, date: string) => `${count} ETFs officially announced a distribution — ${date}`,
    ko: (count: number, date: string) => `${count}개 ETF가 공식 분배금을 발표했습니다 — ${date}`,
  },
  payingToday: {
    en: (count: number) => `${count} ETFs pay a distribution today`,
    ko: (count: number) => `오늘 ${count}개 ETF가 분배금을 지급합니다`,
  },
  payingThisWeek: {
    en: (count: number) => `${count} ETFs are scheduled to pay this week`,
    ko: (count: number) => `이번 주 ${count}개 ETF의 지급이 예정되어 있습니다`,
  },
  highestYield: {
    en: (ticker: string, pct: string) => `Highest annualized yield today: ${ticker} at ${pct}`,
    ko: (ticker: string, pct: string) => `오늘의 최고 연환산 분배율: ${ticker} (${pct})`,
  },
  rising: {
    en: (count: number) => `${count} ETFs increased their distribution vs. their last payment`,
    ko: (count: number) => `${count}개 ETF의 분배금이 직전 지급 대비 증가했습니다`,
  },
} as const;

export type HighlightsData = {
  announcementCount: number | null;
  announcementDate: string | null;
  todayCount: number;
  weekCount: number;
  highestYieldTicker: string | null;
  highestYieldPct: number | null;
  risingCount: number;
};

/** Rule-based highlights, not generated prose — every line here is a plain
 * template around a real, already-fetched number (Homepage Phase 4, Part
 * 2). No line is shown unless the underlying count is genuinely > 0, so
 * this section never claims something happened that didn't. */
export function TodaysHighlights({
  data,
  lang = "en",
  basePath = "",
}: {
  data: HighlightsData;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const rows: { text: string; href: string }[] = [];

  if (data.announcementCount != null && data.announcementCount > 0 && data.announcementDate) {
    rows.push({
      text: T.announced[lang](data.announcementCount, data.announcementDate),
      href: `${basePath}/distributions`,
    });
  }
  if (data.todayCount > 0) {
    rows.push({ text: T.payingToday[lang](data.todayCount), href: `${basePath}/calendar` });
  }
  if (data.highestYieldTicker && data.highestYieldPct != null) {
    rows.push({
      text: T.highestYield[lang](data.highestYieldTicker, `${data.highestYieldPct.toFixed(1)}%`),
      href: `${basePath}/${data.highestYieldTicker.toLowerCase()}`,
    });
  }
  if (data.risingCount > 0) {
    rows.push({ text: T.rising[lang](data.risingCount), href: `${basePath}/ranking` });
  }
  if (data.weekCount > 0) {
    rows.push({ text: T.payingThisWeek[lang](data.weekCount), href: `${basePath}/calendar` });
  }

  if (rows.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
      <p className="text-xs text-[var(--gray-500)] mt-0.5 mb-4">{T.sub[lang]}</p>
      <div className="border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)]">
        {rows.map((row) => (
          <Link
            key={row.text}
            href={row.href}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--gray-50)] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#92400e] shrink-0" aria-hidden />
            <span className="flex-1">{row.text}</span>
            <span className="text-[var(--gray-400)] shrink-0">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

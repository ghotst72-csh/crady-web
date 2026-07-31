import Link from "next/link";
import type { AnnouncementRow } from "@/lib/distributions/data";
import type { DistributionRow } from "@/lib/distributions/table";
import { Badge } from "@/components/ui/Badge";

const T = {
  heading: { en: "Official Announcements", ko: "공식 발표" },
  sub: {
    en: (count: number, date: string) => `${count} ETFs officially announced · ${date}`,
    ko: (count: number, date: string) => `${count}개 ETF 공식 발표 · ${date}`,
  },
  viewAll: { en: "View all announcements →", ko: "전체 발표 보기 →" },
  perShare: { en: "Dividend", ko: "분배금" },
  rate: { en: "Yield", ko: "수익률" },
  payDate: { en: "Payment", ko: "지급일" },
  popularBadge: { en: "Popular", ko: "인기" },
  na: "—",
} as const;

const POPULAR_TICKERS = ["MSTY", "TSLY", "CONY", "NVDY"];

function formatDate(iso: string, lang: "en" | "ko"): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Magazine-style cards, not a data table — a preview of whatever the
 * latest real announcement contains, popular tickers surfaced first, one
 * click through to the ticker page (Part 10). The full sortable/filterable
 * table stays on /distributions; this is a teaser, not a duplicate of it. */
export function OfficialAnnouncementsPreview({
  announcement,
  rows,
  lang = "en",
  basePath = "",
}: {
  announcement: AnnouncementRow;
  rows: DistributionRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  if (rows.length === 0) return null;

  const popularFirst = [...rows].sort((a, b) => {
    const aPop = POPULAR_TICKERS.includes(a.ticker) ? 0 : 1;
    const bPop = POPULAR_TICKERS.includes(b.ticker) ? 0 : 1;
    return aPop - bPop || a.ticker.localeCompare(b.ticker);
  });
  const preview = popularFirst.slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        <Link href={`${basePath}/distributions`} className="text-sm text-[var(--gray-500)] hover:text-black shrink-0">
          {T.viewAll[lang]}
        </Link>
      </div>
      <p className="text-xs text-[var(--gray-500)] mb-4">
        {T.sub[lang](announcement.etf_count, formatDate(announcement.announcement_date, lang))}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {preview.map((r) => {
          const isPopular = POPULAR_TICKERS.includes(r.ticker);
          return (
            <Link
              key={r.ticker}
              href={`${basePath}/${r.ticker.toLowerCase()}`}
              className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">{r.ticker}</span>
                {isPopular && <Badge variant="accent-outline">{T.popularBadge[lang]}</Badge>}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-[var(--gray-900)] tabular-nums">
                  {r.distributionPerShare != null ? `$${r.distributionPerShare.toFixed(4)}` : T.na}
                </span>
                <span className="text-sm font-bold text-[#92400e] tabular-nums">
                  {r.distributionRate != null ? `${r.distributionRate.toFixed(1)}%` : T.na}
                </span>
              </div>
              <div className="text-xs text-[var(--gray-500)] mt-1">
                {T.payDate[lang]} {r.payDate}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

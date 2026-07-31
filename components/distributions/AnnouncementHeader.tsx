import { providerLabel } from "@/lib/providers";
import { Badge } from "@/components/ui/Badge";
import type { AnnouncementRow } from "@/lib/distributions/data";
import { maxBy, type DistributionRow } from "@/lib/distributions/table";

const T = {
  officialBadge: { en: "Official data", ko: "공식 데이터" },
  eyebrow: { en: "Official Announcements", ko: "공식 발표" },
  etfsAnnounced: { en: "ETFs announced", ko: "개 ETF 발표" },
  lastUpdated: { en: "Last updated", ko: "마지막 업데이트" },
  source: { en: "Source", ko: "출처" },
  viewSource: { en: "View original announcement →", ko: "원문 발표 보기 →" },
  highestDistribution: { en: "Highest Distribution", ko: "최고 분배금" },
  highestYield: { en: "Highest Yield", ko: "최고 수익률" },
  announcementDate: { en: "Announcement Date", ko: "발표일" },
} as const;

function formatDate(iso: string, lang: "en" | "ko"): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTimestamp(iso: string, lang: "en" | "ko"): string {
  const d = new Date(iso);
  return d.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The Distribution Center's "hero moment" (variant="hero", used on
 * /distributions itself — the page's single most important fact, the ETF
 * count, gets the same big-stat treatment as EtfHero's yield percentage)
 * and the more compact header reused on archive/announcement detail pages
 * (variant="compact", the default) where the full table + insights below
 * already carry the page's weight. */
export function AnnouncementHeader({
  announcement,
  rows,
  lang = "en",
  variant = "compact",
}: {
  announcement: AnnouncementRow;
  /** Hero variant only — powers the "today's market summary" strip (Visual
   * Hierarchy Phase 2, Part 1). Omitted on the compact variant, which has
   * no need for it (the full KPI dashboard already sits right below it on
   * the pages that use hero). */
  rows?: DistributionRow[];
  lang?: "en" | "ko";
  variant?: "hero" | "compact";
}) {
  if (variant === "hero") {
    const highestDist = rows ? maxBy(rows, (r) => r.distributionPerShare) : null;
    const highestYield = rows ? maxBy(rows, (r) => r.distributionRate) : null;

    return (
      <div className="border border-[var(--gray-200)] rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[var(--gray-50)] to-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {T.eyebrow[lang]}
          </span>
          <Badge variant="accent">{T.officialBadge[lang]}</Badge>
        </div>

        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          {/* #92400e, not --crady-accent — see components/ui/KpiCard.tsx
              for why (the raw brand accent fails WCAG text contrast). */}
          <span className="text-5xl sm:text-6xl font-black text-[#92400e] leading-none">
            {announcement.etf_count}
          </span>
          <span className="text-lg sm:text-xl font-bold text-[var(--gray-900)]">
            {T.etfsAnnounced[lang]}
          </span>
        </div>

        <h1 className="mt-4 text-lg sm:text-xl font-bold leading-snug">{announcement.title}</h1>

        {/* Today's-market-summary strip — turns the hero from a single
            number into a real summary a reader can act on without scrolling
            to the KPI dashboard below. */}
        {(highestDist || highestYield) && (
          <div className="mt-5 pt-4 border-t border-[var(--gray-200)]/70 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {highestDist && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--gray-500)] font-semibold">
                  {T.highestDistribution[lang]}
                </div>
                <div className="mt-0.5 font-bold text-sm sm:text-base">
                  {highestDist.ticker}{" "}
                  <span className="font-semibold text-[var(--gray-700)]">
                    ${highestDist.distributionPerShare!.toFixed(4)}
                  </span>
                </div>
              </div>
            )}
            {highestYield && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--gray-500)] font-semibold">
                  {T.highestYield[lang]}
                </div>
                <div className="mt-0.5 font-bold text-sm sm:text-base">
                  {highestYield.ticker}{" "}
                  <span className="font-semibold text-[#92400e]">
                    {highestYield.distributionRate!.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--gray-500)] font-semibold">
                {T.announcementDate[lang]}
              </div>
              <div className="mt-0.5 font-bold text-sm sm:text-base text-[var(--gray-900)]">
                {formatDate(announcement.announcement_date, lang)}
              </div>
              <div className="text-xs text-[var(--gray-500)]">{providerLabel(announcement.provider_id)}</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[var(--gray-500)]">
          <span>
            {T.lastUpdated[lang]}: {formatTimestamp(announcement.fetched_at, lang)}
          </span>
          <a
            href={announcement.source_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-[#92400e] hover:underline"
          >
            {T.viewSource[lang]}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 bg-[var(--gray-50)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
          {providerLabel(announcement.provider_id)}
        </span>
        <Badge variant="accent">{T.officialBadge[lang]}</Badge>
      </div>
      <h1 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">{announcement.title}</h1>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-[var(--gray-600)]">
        <span>{formatDate(announcement.announcement_date, lang)}</span>
        <span>
          {announcement.etf_count} {T.etfsAnnounced[lang]}
        </span>
        <span>
          {T.lastUpdated[lang]}: {formatTimestamp(announcement.fetched_at, lang)}
        </span>
      </div>
      <a
        href={announcement.source_url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-3 inline-block text-sm font-medium text-[#92400e] hover:underline"
      >
        {T.viewSource[lang]}
      </a>
    </div>
  );
}

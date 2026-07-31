import { providerLabel } from "@/lib/providers";
import { Badge } from "@/components/ui/Badge";
import type { AnnouncementRow } from "@/lib/distributions/data";

const T = {
  officialBadge: { en: "Official data", ko: "공식 데이터" },
  eyebrow: { en: "Latest Official Distribution", ko: "최신 공식 분배금" },
  etfsAnnounced: { en: "ETFs announced", ko: "개 ETF 발표" },
  lastUpdated: { en: "Last updated", ko: "마지막 업데이트" },
  source: { en: "Source", ko: "출처" },
  viewSource: { en: "View original announcement →", ko: "원문 발표 보기 →" },
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
  lang = "en",
  variant = "compact",
}: {
  announcement: AnnouncementRow;
  lang?: "en" | "ko";
  variant?: "hero" | "compact";
}) {
  if (variant === "hero") {
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
        <div className="mt-1 text-sm text-[var(--gray-600)]">
          {formatDate(announcement.announcement_date, lang)} · {providerLabel(announcement.provider_id)}
        </div>

        <h1 className="mt-4 text-lg sm:text-xl font-bold leading-snug">{announcement.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[var(--gray-500)]">
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

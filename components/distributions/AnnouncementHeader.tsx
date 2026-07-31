import { providerLabel } from "@/lib/providers";
import type { AnnouncementRow } from "@/lib/distributions/data";

const T = {
  officialBadge: { en: "Official data", ko: "공식 데이터" },
  etfCount: { en: (n: number) => `${n} ETFs announced`, ko: (n: number) => `${n}개 ETF 발표` },
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

export function AnnouncementHeader({
  announcement,
  lang = "en",
}: {
  announcement: AnnouncementRow;
  lang?: "en" | "ko";
}) {
  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 bg-[var(--gray-50)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
          {providerLabel(announcement.provider_id)}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[var(--crady-accent)]/15 text-[var(--crady-accent)] text-[11px] font-semibold">
          {T.officialBadge[lang]}
        </span>
      </div>
      <h1 className="mt-2 text-xl sm:text-2xl font-bold leading-snug">{announcement.title}</h1>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-[var(--gray-600)]">
        <span>{formatDate(announcement.announcement_date, lang)}</span>
        <span>{T.etfCount[lang](announcement.etf_count)}</span>
        <span>
          {T.lastUpdated[lang]}: {formatTimestamp(announcement.fetched_at, lang)}
        </span>
      </div>
      <a
        href={announcement.source_url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-3 inline-block text-sm font-medium text-[var(--crady-accent)] hover:underline"
      >
        {T.viewSource[lang]}
      </a>
    </div>
  );
}

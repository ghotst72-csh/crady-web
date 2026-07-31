const T = {
  etfsTracked: { en: "ETFs Tracked", ko: "추적 ETF" },
  distributionsTracked: { en: "Distribution Records", ko: "분배 기록" },
  announcementsTracked: { en: "Official Announcements", ko: "공식 발표" },
  predictionCoverage: { en: "Prediction Coverage", ko: "예측 커버리지" },
  lastUpdated: { en: "Last Updated", ko: "마지막 업데이트" },
} as const;

function formatUpdatedAt(iso: string | null, lang: "en" | "ko"): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
      timeZone: "Asia/Seoul",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** A slim credibility strip, not another KPI grid — Homepage Phase 4, Part
 * 6: scale and freshness signals belong right under the Hero, quiet and
 * factual, not competing with it for attention. Every number here is a
 * plain count or a max() over already-fetched data, nothing estimated. */
export function TrustBar({
  etfsTracked,
  distributionRecords,
  announcementsTracked,
  predictionCount,
  lastUpdatedIso,
  lang = "en",
}: {
  etfsTracked: number;
  distributionRecords: number;
  announcementsTracked: number;
  predictionCount: number;
  lastUpdatedIso: string | null;
  lang?: "en" | "ko";
}) {
  const coveragePct = etfsTracked > 0 ? Math.round((predictionCount / etfsTracked) * 100) : null;
  const updated = formatUpdatedAt(lastUpdatedIso, lang);

  const items = [
    { label: T.etfsTracked[lang], value: etfsTracked },
    { label: T.distributionsTracked[lang], value: distributionRecords.toLocaleString(lang === "ko" ? "ko-KR" : "en-US") },
    { label: T.announcementsTracked[lang], value: announcementsTracked },
    { label: T.predictionCoverage[lang], value: coveragePct != null ? `${coveragePct}%` : "—" },
    ...(updated ? [{ label: T.lastUpdated[lang], value: `${updated} KST` }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 border border-[var(--gray-200)] rounded-xl px-4 py-2.5 text-xs text-[var(--gray-500)]">
        {items.map((item) => (
          <span key={item.label}>
            <strong className="text-[var(--gray-900)] tabular-nums">{item.value}</strong> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

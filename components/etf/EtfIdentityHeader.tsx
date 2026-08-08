import { providerLabel } from "@/lib/data";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

const T = {
  updated: { en: "Updated", ko: "업데이트" },
  today: { en: "Today", ko: "오늘" },
} as const;

function formatUpdatedAt(iso: string | null, lang: "en" | "ko"): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** CRADY Phase 3 §1 — the ETF's persistent identity header: ticker, name,
 * and (deliberately secondary, never dominant) current price, rendered
 * once above the workspace tab bar so it never changes when switching
 * tabs. Everything that used to compete with the prediction inside the
 * old EtfHero (the CRADY Score/Stability/Risk/Frequency grid, the price
 * range bar, the recent-activity strip) now lives inside the relevant
 * workspace tab instead — this header stays intentionally minimal. */
export function EtfIdentityHeader({
  ticker,
  name,
  providerId,
  category,
  riskLevel,
  updatedAt,
  currentPrice,
  todayChangePct,
  lang = "en",
}: {
  ticker: string;
  name: string | null;
  providerId: string;
  category: string | null;
  riskLevel: string | null;
  updatedAt: string | null;
  currentPrice: number | null;
  todayChangePct: number | null;
  lang?: "en" | "ko";
}) {
  const updatedAtLabel = formatUpdatedAt(updatedAt, lang);
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;
  const up = (todayChangePct ?? 0) >= 0;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{ticker}</h1>
        {name && <span className="text-sm sm:text-base text-[var(--gray-500)]">{name}</span>}

        {/* Price is deliberately the smallest, plainest thing in this
            header (spec §1: "Do NOT allow price information to overpower
            dividend prediction") — a single small line, not a hero number. */}
        {currentPrice != null && (
          <span className="ml-auto flex items-center gap-1.5 text-sm text-[var(--gray-600)] tabular-nums">
            <span className="font-semibold">${currentPrice.toFixed(2)}</span>
            {todayChangePct != null && (
              <span className={`text-xs font-semibold ${up ? "text-emerald-700" : "text-red-700"}`}>
                {up ? "▲" : "▼"} {Math.abs(todayChangePct).toFixed(2)}% {T.today[lang]}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] font-medium">
          {providerLabel(providerId)}
        </span>
        {category && <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">{category}</span>}
        {riskLabel && <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">{riskLabel}</span>}
        {updatedAtLabel && (
          <span className="text-[var(--gray-400)] ml-auto">
            {updatedAtLabel} KST {T.updated[lang]}
          </span>
        )}
      </div>
    </section>
  );
}

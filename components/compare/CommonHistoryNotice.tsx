import { Info, TriangleAlert } from "lucide-react";
import type { SuggestedPeriod } from "@/lib/compare/period";
import { approximateDurationLabel } from "@/lib/compare/period";

const T = {
  checking: { en: "Checking available history…", ko: "이용 가능한 데이터 확인 중…" },
  available: {
    en: (from: string, duration: string) => `Available common history: ${from} – Present (${duration})`,
    ko: (from: string, duration: string) => `공통 이용 가능 기간: ${from} – 현재 (${duration})`,
  },
  tooLong: {
    en: (periodLabel: string, suggestedLabel: string) =>
      `${periodLabel} comparison isn't available for these ETFs. Try ${suggestedLabel} instead.`,
    ko: (periodLabel: string, suggestedLabel: string) =>
      `이 ETF들은 ${periodLabel} 비교가 불가능합니다. ${suggestedLabel}(을)를 시도해보세요.`,
  },
  useSuggested: { en: (label: string) => `Use ${label}`, ko: (label: string) => `${label} 사용` },
} as const;

function fmtMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", timeZone: "UTC" });
}

function fmtCustomRange(customStart: string, customEnd: string): string {
  return `${fmtMonthYear(customStart)} – ${fmtMonthYear(customEnd)}`;
}

export function suggestedPeriodLabel(suggested: SuggestedPeriod): string {
  return suggested.kind === "preset" ? suggested.preset : fmtCustomRange(suggested.customStart, suggested.customEnd);
}

/** Proactive, advisory-only notice — never changes what gets submitted on
 * its own. Tells the user how much real common history their current ETF
 * selection has (computed from each selected ticker's actual earliest
 * recorded price, see CompareWorkspace's getEarliestAvailableDate calls),
 * and if their currently-selected period would exceed it, offers an
 * explicit "Use Xy" shortcut — the user still has to click it. The
 * underlying same-period fairness rule (lib/compare/calculations.ts,
 * lib/compare/discovery.ts) is completely unaffected either way. */
export function CommonHistoryNotice({
  loading,
  commonEarliestDate,
  todayIso,
  currentPeriodLabel,
  periodTooLong,
  suggested,
  onUseSuggested,
  lang = "en",
}: {
  loading: boolean;
  commonEarliestDate: string | null;
  todayIso: string;
  currentPeriodLabel: string;
  periodTooLong: boolean;
  suggested: SuggestedPeriod | null;
  onUseSuggested: () => void;
  lang?: "en" | "ko";
}) {
  if (loading) {
    return <p className="mt-2 text-xs text-[var(--gray-400)]">{T.checking[lang]}</p>;
  }
  if (!commonEarliestDate) return null;

  const duration = approximateDurationLabel(commonEarliestDate, todayIso);

  return (
    <div className="mt-2 space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-[var(--gray-500)]">
        <Info size={13} className="text-blue-500 shrink-0" aria-hidden="true" />
        {T.available[lang](fmtMonthYear(commonEarliestDate), duration)}
      </p>

      {periodTooLong && suggested && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <TriangleAlert size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
          <span className="text-xs text-amber-800">
            {T.tooLong[lang](currentPeriodLabel, suggestedPeriodLabel(suggested))}
          </span>
          <button
            type="button"
            onClick={onUseSuggested}
            className="ml-auto shrink-0 px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {T.useSuggested[lang](suggestedPeriodLabel(suggested))}
          </button>
        </div>
      )}
    </div>
  );
}

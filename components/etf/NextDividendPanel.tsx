import { Megaphone, CalendarClock, Wallet } from "lucide-react";
import { formatConfidencePct } from "@/lib/confidence";

const T = {
  nextDividend: { en: "Next Dividend", ko: "다음 배당" },
  estimated: { en: "Estimated", ko: "예상" },
  confirmed: { en: "Confirmed", ko: "확정" },
  vsLast: { en: (amt: string) => `vs last dividend $${amt}`, ko: (amt: string) => `직전 배당 $${amt} 대비` },
  announcement: { en: "Announcement", ko: "발표일" },
  exDividend: { en: "Ex-Dividend", ko: "배당락일" },
  payment: { en: "Payment", ko: "지급일" },
  confidence: { en: "Confidence", ko: "신뢰도" },
  daysToExDividend: { en: "Days to Ex-Dividend", ko: "배당락일까지" },
  expectedRange: { en: "Expected range", ko: "예상 범위" },
  why: { en: (v: string) => `Why ${v}? →`, ko: (v: string) => `왜 ${v}인가요? →` },
  noPrediction: { en: "No prediction available yet for this ETF.", ko: "이 ETF에 대한 예측 정보가 아직 없습니다." },
  na: "—",
} as const;

export type NextDividendPanelData = {
  amount: number | null;
  isOfficial: boolean;
  confidence: number | null;
  announcementDate: string | null;
  exDate: string | null;
  payDate: string | null;
  previousAmount: number | null;
  changeFromLastPct: number | null;
  whyTab: string | null;
};

export type NextDividendPanelRange = { low: number; high: number };

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string | null, lang: "en" | "ko"): string {
  if (!dateStr) return T.na;
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** CRADY ETF Detail UI (reference-locked) — the Summary tab's single most
 * important element: one wide horizontal panel, the predicted amount
 * dominant on the left, the three real schedule dates on the right, each
 * with its own D-day. No explanatory paragraph inside this card (spec
 * §5: "CRADY Summary 설명문은 이 카드에서 제거한다") — only the "Why
 * $X.XXXX?" link into the Next Dividend tab's full explanation. */
export function NextDividendPanel({
  data,
  expectedRange = null,
  lang = "en",
}: {
  data: NextDividendPanelData;
  /** Next Dividend tab only (Summary omits it, unchanged) — the
   * distribution-variability range already computed elsewhere on the
   * page, shown as one extra line under the badge. */
  expectedRange?: NextDividendPanelRange | null;
  lang?: "en" | "ko";
}) {
  const { amount, isOfficial, confidence, announcementDate, exDate, payDate, previousAmount, changeFromLastPct, whyTab } = data;
  const up = changeFromLastPct != null && changeFromLastPct >= 0;
  const exDday = exDate ? daysUntil(exDate) : null;

  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
        <div className="lg:w-[300px] shrink-0">
          <div className="text-xs font-semibold text-[var(--gray-500)] tracking-wide uppercase">{T.nextDividend[lang]}</div>

          {amount != null ? (
            <>
              <div className="mt-2 flex items-baseline gap-2.5 flex-wrap">
                <span className="text-[56px] leading-none font-bold text-indigo-600 tabular-nums">
                  ${amount.toFixed(4)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    isOfficial ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {isOfficial ? T.confirmed[lang] : T.estimated[lang]}
                </span>
              </div>
              {changeFromLastPct != null && previousAmount != null && (
                <div className={`mt-2 text-sm font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
                  {up ? "▲" : "▼"} {Math.abs(changeFromLastPct).toFixed(1)}% {T.vsLast[lang](previousAmount.toFixed(4))}
                </div>
              )}
              {!isOfficial && expectedRange && (
                <div className="mt-1.5 text-xs text-[var(--gray-500)]">
                  {T.expectedRange[lang]}{" "}
                  <span className="font-semibold text-[var(--gray-700)] tabular-nums">
                    ${expectedRange.low.toFixed(4)} – ${expectedRange.high.toFixed(4)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--gray-400)]">{T.noPrediction[lang]}</p>
          )}
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          <DateColumn icon={<Megaphone size={15} strokeWidth={2} />} label={T.announcement[lang]} date={announcementDate} lang={lang} />
          <DateColumn icon={<CalendarClock size={15} strokeWidth={2} />} label={T.exDividend[lang]} date={exDate} lang={lang} />
          <DateColumn icon={<Wallet size={15} strokeWidth={2} />} label={T.payment[lang]} date={payDate} lang={lang} />
        </div>
      </div>

      {amount != null && (
        <div className="mt-6 pt-5 border-t border-[var(--gray-100)] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8">
            {!isOfficial && confidence != null && (
              <div>
                <div className="text-xs text-[var(--gray-500)]">{T.confidence[lang]}</div>
                <div className="text-lg font-bold mt-0.5 tabular-nums">{formatConfidencePct(confidence, 0)}</div>
              </div>
            )}
            {exDday != null && (
              <div>
                <div className="text-xs text-[var(--gray-500)]">{T.daysToExDividend[lang]}</div>
                <div className="text-lg font-bold mt-0.5 tabular-nums">D-{exDday}</div>
              </div>
            )}
          </div>
          {whyTab && (
            <button
              type="button"
              data-etf-tab-link={whyTab}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              {T.why[lang](`$${amount.toFixed(4)}`)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DateColumn({
  icon,
  label,
  date,
  lang,
}: {
  icon: React.ReactNode;
  label: string;
  date: string | null;
  lang: "en" | "ko";
}) {
  const dday = date ? daysUntil(date) : null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[13px] text-[var(--gray-500)]">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-lg font-bold tabular-nums">{formatDate(date, lang)}</div>
      {dday != null && <div className="mt-0.5 text-xs text-[var(--gray-400)] tabular-nums">(D-{dday})</div>}
    </div>
  );
}

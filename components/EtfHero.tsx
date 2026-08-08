import { PriceBlock } from "./ticker/PriceBlock";
import { formatConfidencePct } from "@/lib/confidence";
import type { PriceSummary } from "@/lib/ticker/priceSummary";
import type { YieldPercentileResult } from "@/lib/ticker/yieldContext";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const T = {
  yieldLabel: { en: "Annual Distribution Yield", ko: "연환산 분배율" },
  recentDividend: { en: "Recent Dividend", ko: "최근 배당금" },
  nextPayDate: { en: "Next Dividend", ko: "다음 지급일" },
  tbd: { en: "TBD", ko: "미정" },
  vsLast: { en: "vs last", ko: "직전 대비" },
  confidence: { en: "confidence", ko: "신뢰도" },
  noPrediction: { en: "No prediction available yet.", ko: "아직 예측 데이터가 없습니다." },
  dueToday: { en: "Paying today", ko: "오늘 지급" },
  daysLeft: { en: (n: number) => `D-${n}`, ko: (n: number) => `D-${n}` },
  nextDividendPrediction: { en: "Next Dividend Prediction", ko: "다음 배당 예측" },
  perShare: { en: "per share", ko: "주당" },
  estimated: { en: "Estimated", ko: "예상" },
  confirmed: { en: "Confirmed", ko: "확정" },
  expectedAnnouncement: { en: "Expected Announcement", ko: "예상 발표일" },
  expectedExDividend: { en: "Expected Ex-Dividend", ko: "예상 배당락일" },
  expectedPayment: { en: "Expected Payment", ko: "예상 지급일" },
  whyThisAmount: { en: (v: string) => `Why ${v}? →`, ko: (v: string) => `왜 ${v}인가요? →` },
  currentPrice: { en: "Current Price", ko: "현재가" },
  asOf: { en: "As of", ko: "" },
  asOfSuffix: { en: "", ko: " 기준" },
  noPriceData: { en: "No price data available yet", ko: "아직 가격 데이터가 없습니다" },
  noPriceDataSub: {
    en: "Price history for this ETF hasn't been recorded yet.",
    ko: "이 ETF의 가격 이력이 아직 기록되지 않았습니다.",
  },
} as const;

export type EtfHeroNextDividend = {
  amount: number | null;
  isOfficial: boolean;
  confidence: number | null;
  announcementDate: string | null;
  exDate: string | null;
  payDate: string | null;
  previousAmount: number | null;
  changeFromLastPct: number | null;
  /** CRADY Phase 3 — an EtfWorkspaceTabId (e.g. "next-dividend"), not a URL
   * fragment: the detailed "why" explanation now lives inside the Next
   * Dividend workspace tab, so this renders as a data-etf-tab-link button
   * that switches tabs rather than an anchor scroll. Null when there's
   * nothing to explain yet. */
  whyTab: string | null;
};

/** CRADY Phase 3 — the Summary tab's #1-priority content (spec §3.1): the
 * Next Dividend Prediction, and nothing else competing with it. Identity
 * (ticker/name/badges) now lives in the persistent EtfIdentityHeader above
 * the workspace tab bar; CRADY Score/Stability/Risk/Frequency now live in
 * EtfSummaryMetrics; recent payments now live in the dedicated "Recent
 * Distributions" list — all previously duplicated inside this component.
 * What remains here is deliberately just: one short direct-answer sentence
 * (SEO） + the single most important number on the page. */
export function EtfHero({
  yieldPct,
  latestDividend,
  prediction,
  changeFromLastPct,
  nextDividend = null,
  directAnswer,
  priceSummary = null,
  yieldContext = null,
  lang = "en",
}: {
  yieldPct: number | null;
  latestDividend: { amount: number; payDate: string } | null;
  prediction: {
    targetPayDate: string | null;
    targetExDate: string | null;
    predictedAmount: number | null;
    confidenceScore: number | null;
  } | null;
  changeFromLastPct: number | null;
  /** When present, this is the Summary tab's dominant headline — sourced
   * from the exact same nextDividendIntelligenceData the Next Dividend tab
   * renders, so the two can never show a different amount. */
  nextDividend?: EtfHeroNextDividend | null;
  /** One short, self-contained "direct answer" sentence (SEO Authority
   * Phase 2, lib/ticker/directAnswer.ts) — the concise natural-language
   * answer search intent needs (Phase 3 spec §11), above the headline. */
  directAnswer?: string;
  /** Real current price, today's change, 1W/1M/3M sparkline — built by
   * lib/ticker/priceSummary.ts. Falls back to the yield-only headline when
   * there's no prediction AND no price (never fabricated). */
  priceSummary?: PriceSummary | null;
  /** Sitewide yield-percentile context for the bare yield % — null when
   * the sample is too small to be meaningful. */
  yieldContext?: YieldPercentileResult | null;
  lang?: "en" | "ko";
}) {
  const hasPrediction = prediction != null && (prediction.predictedAmount != null || prediction.targetPayDate != null);

  const priceAsOfLabel =
    priceSummary?.asOfDate != null
      ? lang === "ko"
        ? `${priceSummary.asOfDate}${T.asOfSuffix.ko}`
        : `${T.asOf.en} ${priceSummary.asOfDate}`
      : null;

  return (
    <section>
      {directAnswer && (
        <p className="text-sm sm:text-[15px] text-[var(--gray-700)] leading-relaxed max-w-2xl">{directAnswer}</p>
      )}

      {/* Next Dividend Prediction — the single most important card on the
          page (spec §3.1/§9: "the predicted dividend amount should
          normally be the strongest number on the page"). Falls back to a
          price/yield-first card only when there's genuinely nothing to
          predict yet. */}
      {nextDividend?.amount != null ? (
        <div className="mt-3">
          <NextDividendPrimaryCard nextDividend={nextDividend} priceSummary={priceSummary} lang={lang} />
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-[var(--gray-200)] bg-gradient-to-br from-white to-[var(--gray-50)] p-5 sm:p-6">
          {priceSummary?.currentPrice != null ? (
            <PriceBlock summary={priceSummary} asOfLabel={priceAsOfLabel} lang={lang} />
          ) : yieldPct != null ? (
            <div>
              <div className="text-hero-number text-5xl sm:text-7xl text-[var(--crady-accent)]">{yieldPct.toFixed(1)}%</div>
              <div className="mt-2 text-sm font-semibold text-[var(--gray-600)]">{T.yieldLabel[lang]}</div>
            </div>
          ) : (
            <div className="py-1.5">
              <div className="text-lg font-bold text-[var(--gray-500)]">{T.noPriceData[lang]}</div>
              <div className="mt-1 text-sm text-[var(--gray-400)]">{T.noPriceDataSub[lang]}</div>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-[var(--gray-200)] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MiniStat
              label={T.nextPayDate[lang]}
              value={prediction?.predictedAmount != null ? `$${prediction.predictedAmount.toFixed(4)}` : "—"}
              sub={prediction?.targetPayDate ?? T.tbd[lang]}
            />
            <MiniStat
              label={T.recentDividend[lang]}
              value={latestDividend ? `$${latestDividend.amount.toFixed(4)}` : "—"}
              sub={latestDividend?.payDate}
            />
            <MiniStat
              label={T.yieldLabel[lang]}
              value={yieldPct != null ? `${yieldPct.toFixed(1)}%` : "—"}
              accent
              badge={yieldContext?.label}
            />
          </div>

          {hasPrediction && (
            <div className="mt-4 pt-4 border-t border-[var(--gray-200)] text-sm text-[var(--gray-700)]">
              {prediction!.targetPayDate && (
                <>
                  <strong className="font-semibold">{prediction!.targetPayDate}</strong>{" "}
                </>
              )}
              {changeFromLastPct != null &&
                `(${T.vsLast[lang]} ${changeFromLastPct > 0 ? "+" : ""}${changeFromLastPct.toFixed(1)}%) `}
              {prediction!.confidenceScore != null &&
                `· ${T.confidence[lang]} ${formatConfidencePct(prediction!.confidenceScore, 0)}`}
            </div>
          )}
          {!hasPrediction && <p className="mt-4 text-sm text-[var(--gray-400)]">{T.noPrediction[lang]}</p>}
        </div>
      )}
    </section>
  );
}

function NextDividendPrimaryCard({
  nextDividend,
  priceSummary,
  lang,
}: {
  nextDividend: EtfHeroNextDividend;
  priceSummary: PriceSummary | null;
  lang: "en" | "ko";
}) {
  const amount = nextDividend.amount!;
  const dDay = nextDividend.payDate ? daysUntil(nextDividend.payDate) : null;

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-gradient-to-br from-white to-[var(--gray-50)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-caption">{T.nextDividendPrediction[lang]}</div>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            nextDividend.isOfficial ? "bg-emerald-50 text-emerald-700" : "bg-[var(--crady-accent)]/15 text-[#92400e]"
          }`}
        >
          {nextDividend.isOfficial ? T.confirmed[lang] : T.estimated[lang]}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <div className="text-hero-number text-5xl sm:text-7xl text-[var(--crady-accent)]">${amount.toFixed(4)}</div>
        <span className="text-sm text-[var(--gray-500)]">{T.perShare[lang]}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--gray-600)]">
        {dDay != null && (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-black text-white text-xs font-bold tabular-nums">
            {dDay <= 0 ? T.dueToday[lang] : T.daysLeft[lang](dDay)}
          </span>
        )}
        {!nextDividend.isOfficial && nextDividend.confidence != null && (
          <span>
            {T.confidence[lang]} <strong className="text-black">{formatConfidencePct(nextDividend.confidence, 0)}</strong>
          </span>
        )}
        {nextDividend.changeFromLastPct != null && (
          <span className={`font-semibold ${nextDividend.changeFromLastPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {nextDividend.changeFromLastPct >= 0 ? "▲ +" : "▼ "}
            {Math.abs(nextDividend.changeFromLastPct).toFixed(1)}% {T.vsLast[lang]}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <DateChip label={T.expectedAnnouncement[lang]} date={nextDividend.announcementDate} />
        <DateChip label={T.expectedExDividend[lang]} date={nextDividend.exDate} />
        <DateChip label={T.expectedPayment[lang]} date={nextDividend.payDate} />
      </div>

      {nextDividend.whyTab && (
        <button
          type="button"
          data-etf-tab-link={nextDividend.whyTab}
          className="mt-4 inline-flex items-center text-sm font-semibold text-[#92400e] hover:underline"
        >
          {T.whyThisAmount[lang](`$${amount.toFixed(4)}`)}
        </button>
      )}

      {priceSummary?.currentPrice != null && (
        <div className="mt-4 pt-4 border-t border-[var(--gray-200)] flex items-center gap-2 text-sm">
          <span className="text-[var(--gray-500)]">{T.currentPrice[lang]}</span>
          <span className="font-bold tabular-nums">${priceSummary.currentPrice.toFixed(2)}</span>
          {priceSummary.todayChangePct != null && (
            <span
              className={`text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                priceSummary.todayChangePct >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
              }`}
            >
              {priceSummary.todayChangePct >= 0 ? "▲" : "▼"} {Math.abs(priceSummary.todayChangePct).toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DateChip({ label, date }: { label: string; date: string | null }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className="text-sm font-bold tabular-nums mt-0.5">{date ?? "—"}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: string;
  sub?: string | null;
  accent?: boolean;
  badge?: string | null;
}) {
  return (
    <div>
      <div className="text-caption">{label}</div>
      <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${accent ? "text-[var(--crady-accent)]" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--gray-500)] mt-0.5 truncate">{sub}</div>}
      {badge && (
        <div className="mt-1.5 text-[11px] text-[#92400e] font-semibold">{badge}</div>
      )}
    </div>
  );
}

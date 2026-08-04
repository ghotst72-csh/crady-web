import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import type { PortfolioAnalysis } from "@/lib/portfolio/analyze";

const T = {
  totalInvested: { en: "Total Invested", ko: "총 투자금액" },
  currentValue: { en: "Current Portfolio Value", ko: "현재 평가금액" },
  priceGainLoss: { en: "Unrealized Price Gain/Loss", ko: "미실현 가격 손익" },
  totalDividends: { en: "Total Dividends Received", ko: "누적 배당금" },
  totalReturn: { en: "Total Return", ko: "총수익" },
  totalReturnPct: { en: "Total Return %", ko: "총수익률" },
  annualizedReturn: { en: "Annualized Return", ko: "연환산 수익률" },
  estAnnualIncome: { en: "Est. Current Annual Income", ko: "예상 연간 배당수입" },
  estMonthlyIncome: { en: "Est. Monthly Income", ko: "예상 월 배당수입" },
  breakdownTitle: { en: "Where Your Return Came From", ko: "수익 구성" },
  initial: { en: "Initial investment", ko: "초기 투자금" },
  current: { en: "Current value", ko: "현재 평가금액" },
  dividendsReceived: { en: "Dividends received", ko: "수령한 배당금" },
  netResult: { en: "Net result", ko: "순손익" },
  noData: {
    en: "None of your holdings have enough real data to compute portfolio totals yet.",
    ko: "포트폴리오 합계를 계산할 만큼 데이터가 충분한 보유 종목이 아직 없습니다.",
  },
} as const;

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function PortfolioSnapshot({
  totals,
  lang = "en",
}: {
  totals: PortfolioAnalysis["totals"];
  lang?: "en" | "ko";
}) {
  const {
    totalInvested,
    totalCurrentValue,
    totalDividendsReceived,
    totalPriceReturnAmount,
    totalReturnAmount,
    totalReturnPct,
    annualizedReturnPct,
    estAnnualIncome,
    estMonthlyIncome,
  } = totals;

  // totalReturnPct is only null when zero holdings had enough real data to
  // contribute to the aggregate (see analyze.ts) — a genuinely break-even
  // portfolio would still be a real 0, not null. Showing "$0" across every
  // KPI in the no-data case would read as "you have no money invested,"
  // which is false and misleading; an explicit message is more honest.
  if (totalReturnPct == null) {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] p-5 text-sm text-[var(--gray-500)]">
        {T.noData[lang]}
      </div>
    );
  }

  const items: KpiItem[] = [
    { label: T.totalInvested[lang], value: money(totalInvested), size: "sm" },
    { label: T.currentValue[lang], value: money(totalCurrentValue), size: "sm" },
    {
      label: T.priceGainLoss[lang],
      value: `${totalPriceReturnAmount >= 0 ? "▲" : "▼"} ${money(totalPriceReturnAmount)}`,
      size: "sm",
    },
    { label: T.totalDividends[lang], value: money(totalDividendsReceived), size: "sm", accent: true },
    {
      label: T.totalReturn[lang],
      value: `${totalReturnAmount >= 0 ? "▲" : "▼"} ${money(totalReturnAmount)}`,
      size: "lg",
      accent: totalReturnAmount >= 0,
    },
    {
      label: T.totalReturnPct[lang],
      value: totalReturnPct != null ? `${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(1)}%` : "—",
      size: "lg",
      accent: (totalReturnPct ?? 0) >= 0,
    },
    {
      label: T.annualizedReturn[lang],
      value: annualizedReturnPct != null ? `${annualizedReturnPct >= 0 ? "+" : ""}${annualizedReturnPct.toFixed(1)}%` : "—",
      size: "sm",
    },
    { label: T.estAnnualIncome[lang], value: money(estAnnualIncome), sublabel: `${money(estMonthlyIncome)}/mo`, size: "sm" },
  ];

  // "Where Your Return Came From" — a simple stacked bar (current value +
  // dividends) against an "initial investment" reference marker, plain
  // HTML/CSS, no chart library. The text summary right below it carries
  // the same numbers for accessibility / screen readers.
  const maxScale = Math.max(totalCurrentValue + totalDividendsReceived, totalInvested, 1);
  const currentPct = (Math.max(totalCurrentValue, 0) / maxScale) * 100;
  const dividendsPct = (Math.max(totalDividendsReceived, 0) / maxScale) * 100;
  const investedMarkerPct = (totalInvested / maxScale) * 100;

  return (
    <div>
      <KpiGrid items={items} columns={4} />

      <div className="mt-6 rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
        <div className="text-caption mb-3">{T.breakdownTitle[lang]}</div>

        <div
          className="relative h-8 rounded-lg bg-[var(--gray-100)] overflow-hidden"
          role="img"
          aria-label={`${T.current[lang]} ${money(totalCurrentValue)}, ${T.dividendsReceived[lang]} ${money(totalDividendsReceived)}, ${T.initial[lang]} ${money(totalInvested)}`}
        >
          <div className="absolute inset-y-0 left-0 flex h-full">
            <div className="h-full bg-[var(--gray-700)]" style={{ width: `${currentPct}%` }} />
            <div className="h-full bg-[var(--crady-accent)]" style={{ width: `${dividendsPct}%` }} />
          </div>
          <div
            className="absolute inset-y-0 w-0.5 bg-black"
            style={{ left: `${Math.min(investedMarkerPct, 100)}%` }}
            title={`${T.initial[lang]}: ${money(totalInvested)}`}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--gray-700)] shrink-0" />
            <span className="text-[var(--gray-600)]">{T.current[lang]}</span>
            <span className="font-semibold tabular-nums ml-auto">{money(totalCurrentValue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--crady-accent)] shrink-0" />
            <span className="text-[var(--gray-600)]">{T.dividendsReceived[lang]}</span>
            <span className="font-semibold tabular-nums ml-auto">{money(totalDividendsReceived)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-0.5 bg-black shrink-0" />
            <span className="text-[var(--gray-600)]">{T.initial[lang]}</span>
            <span className="font-semibold tabular-nums ml-auto">{money(totalInvested)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--gray-600)]">{T.netResult[lang]}</span>
            <span className={`font-bold tabular-nums ml-auto ${totalReturnAmount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {money(totalReturnAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

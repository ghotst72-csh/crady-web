import type { HoldingResult, AlternativeResult } from "@/lib/portfolio/types";

const T = {
  title: { en: "What If You'd Bought Something Else Instead?", ko: "같은 날, 다른 ETF를 샀다면?" },
  subtitle: {
    en: (ticker: string, amount: string, date: string) =>
      `Same $${amount} invested in ${ticker} on ${date}, compared against real alternatives with real data.`,
    ko: (ticker: string, amount: string, date: string) =>
      `${date}에 ${ticker}에 동일하게 $${amount}를 투자했을 경우와, 실제 데이터가 있는 대안 상품을 비교합니다.`,
  },
  yourPosition: { en: "Your Position", ko: "내 보유 종목" },
  investment: { en: "Investment", ko: "투자금" },
  currentValue: { en: "Current Value", ko: "현재 평가금액" },
  dividends: { en: "Dividends", ko: "배당금" },
  totalReturn: { en: "Total Return", ko: "총수익률" },
  maxDrawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
  noAlternatives: {
    en: "No alternative ETFs with enough real data were found for a fair comparison of this holding.",
    ko: "이 종목을 공정하게 비교할 수 있는, 데이터가 충분한 대안 ETF를 찾지 못했습니다.",
  },
  dataGapNote: {
    en: "CRADY tracks 72 YieldMax / Roundhill / Defiance ETFs. Broad-market or other-issuer tickers without real price history in CRADY aren't offered as comparisons.",
    ko: "CRADY는 YieldMax, Roundhill, Defiance 소속 72개 ETF를 추적합니다. CRADY에 실제 가격 이력이 없는 시장지수·타 운용사 상품은 비교 대상으로 제시되지 않습니다.",
  },
} as const;

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function AlternativeComparisonTable({
  result,
  alternatives,
  lang = "en",
}: {
  result: HoldingResult;
  alternatives: AlternativeResult[];
  lang?: "en" | "ko";
}) {
  if (!result.resolved) return null;
  const { ticker } = result.holding;
  const invested = result.resolved.investmentAmount;

  return (
    <div>
      <h3 className="text-sm font-bold">{T.title[lang]}</h3>
      <p className="text-xs text-[var(--gray-500)] mt-1 max-w-xl">
        {T.subtitle[lang](ticker, invested.toLocaleString("en-US", { maximumFractionDigits: 0 }), result.holding.purchaseDate)}
      </p>

      {alternatives.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--gray-400)]">{T.noAlternatives[lang]}</p>
      ) : (
        <div className="mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{lang === "ko" ? "투자" : "Investment"}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.currentValue[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.dividends[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.totalReturn[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.maxDrawdown[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                <tr className="bg-[var(--gray-50)]/70 font-semibold">
                  <td className="px-4 py-2.5">
                    {T.yourPosition[lang]} ({ticker})
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {result.currentValue != null ? money(result.currentValue) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[#92400e]">
                    {money(result.totalDividendsReceived)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${
                      (result.totalReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {result.totalReturnPct != null ? `${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-700">
                    {result.maxDrawdownPct != null ? `${result.maxDrawdownPct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
                {alternatives.map((alt) => (
                  <tr key={alt.ticker} className="hover:bg-[var(--gray-100)]/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold">{alt.ticker}</div>
                      <div className="text-[11px] text-[var(--gray-500)] max-w-[220px]">{alt.reason}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {alt.currentValue != null ? money(alt.currentValue) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[#92400e]">
                      {alt.dividendsReceived != null ? money(alt.dividendsReceived) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        (alt.totalReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {alt.totalReturnPct != null ? `${alt.totalReturnPct >= 0 ? "+" : ""}${alt.totalReturnPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-700">
                      {alt.maxDrawdownPct != null ? `${alt.maxDrawdownPct.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[11px] text-[var(--gray-400)] mt-2 max-w-xl">{T.dataGapNote[lang]}</p>
    </div>
  );
}

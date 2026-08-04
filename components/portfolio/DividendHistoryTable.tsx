import type { HoldingResult } from "@/lib/portfolio/types";

const T = {
  title: { en: "Dividends Received Since Purchase", ko: "매수 이후 받은 배당금" },
  note: {
    en: "Only real distributions with an ex-dividend date on or after your purchase date are included. Future predictions are never counted toward your totals.",
    ko: "매수일 이후 ex-dividend date인 실제 배당만 포함됩니다. 향후 예측 배당은 총액에 포함되지 않습니다.",
  },
  exDate: { en: "Ex-Date", ko: "기준일" },
  payDate: { en: "Pay Date", ko: "지급일" },
  perShare: { en: "Per Share", ko: "주당 배당금" },
  received: { en: "Received", ko: "수령액" },
  cumulative: { en: "Cumulative", ko: "누적" },
  empty: { en: "No dividends received yet since this purchase date.", ko: "매수일 이후 수령한 배당금이 없습니다." },
} as const;

export function DividendHistoryTable({ result, lang = "en" }: { result: HoldingResult; lang?: "en" | "ko" }) {
  const { eligibleDividends } = result;
  type Row = { exDate: string; payDate: string; amountPerShare: number; totalReceived: number; cumulative: number };
  const rows = eligibleDividends.reduce<Row[]>(
    (acc, d) => [...acc, { ...d, cumulative: (acc[acc.length - 1]?.cumulative ?? 0) + d.totalReceived }],
    []
  );

  return (
    <div>
      <h3 className="text-sm font-bold">
        {result.holding.ticker} — {T.title[lang]}
      </h3>
      <p className="text-xs text-[var(--gray-500)] mt-1 max-w-xl">{T.note[lang]}</p>

      {eligibleDividends.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      ) : (
        <div className="mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{T.exDate[lang]}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{T.payDate[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.perShare[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.received[lang]}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{T.cumulative[lang]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {rows.map((d, i) => (
                  <tr
                    key={`${d.exDate}-${i}`}
                    className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-[var(--gray-600)] tabular-nums">{d.exDate}</td>
                    <td className="px-4 py-2.5 text-[var(--gray-600)] tabular-nums">{d.payDate}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">${d.amountPerShare.toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#92400e]">
                      ${d.totalReceived.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--gray-500)]">
                      ${d.cumulative.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

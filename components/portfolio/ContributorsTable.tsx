import type { PortfolioAnalysis } from "@/lib/portfolio/analyze";

const T = {
  title: { en: "Portfolio Return Contributors", ko: "종목별 손익 기여도" },
  price: { en: "Price", ko: "가격" },
  dividends: { en: "Dividends", ko: "배당" },
  net: { en: "Net", ko: "순손익" },
  onlyOneHolding: { en: "Add a second holding to compare contributors.", ko: "두 번째 종목을 추가하면 기여도를 비교할 수 있습니다." },
} as const;

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function ContributorsTable({
  contributors,
  lang = "en",
}: {
  contributors: PortfolioAnalysis["contributors"];
  lang?: "en" | "ko";
}) {
  if (contributors.length < 2) {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
        <div className="text-caption">{T.title[lang]}</div>
        <p className="mt-2 text-sm text-[var(--gray-400)]">{T.onlyOneHolding[lang]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="text-caption mb-3">{T.title[lang]}</div>
      <div className="space-y-3">
        {contributors.map((c) => (
          <div key={c.ticker}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{c.ticker}</span>
              <span className={`font-bold tabular-nums ${c.netContribution >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {money(c.netContribution)}
              </span>
            </div>
            <div className="mt-1 flex gap-4 text-xs text-[var(--gray-500)]">
              <span>
                {T.price[lang]}: <span className={c.priceContribution >= 0 ? "text-emerald-700" : "text-red-700"}>{money(c.priceContribution)}</span>
              </span>
              <span>
                {T.dividends[lang]}: <span className="text-[#92400e]">{money(c.dividendContribution)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

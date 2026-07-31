import Link from "next/link";
import type { DistributionRow } from "@/lib/distributions/table";
import type { DistributionChange } from "@/lib/distributions/data";

const T = {
  increases: { en: "Largest Increases", ko: "가장 크게 증가한 종목" },
  decreases: { en: "Largest Decreases", ko: "가장 크게 감소한 종목" },
  highestRoc: { en: "Highest ROC", ko: "ROC 최고" },
  lowestRoc: { en: "Lowest ROC", ko: "ROC 최저" },
  none: { en: "No prior data to compare.", ko: "비교할 이전 데이터가 없습니다." },
} as const;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  );
}

function TickerLink({ ticker, basePath, value }: { ticker: string; basePath: string; value: string }) {
  return (
    <li className="flex items-center justify-between py-1 text-sm">
      <Link href={`${basePath}/${ticker.toLowerCase()}`} className="font-semibold hover:underline">
        {ticker}
      </Link>
      <span className="text-[var(--gray-600)]">{value}</span>
    </li>
  );
}

export function AnnouncementInsights({
  changes,
  rows,
  lang = "en",
  basePath = "",
}: {
  changes: DistributionChange[];
  rows: DistributionRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const topIncreases = [...changes].sort((a, b) => b.changePct - a.changePct).slice(0, 5).filter((c) => c.changePct > 0);
  const topDecreases = [...changes].sort((a, b) => a.changePct - b.changePct).slice(0, 5).filter((c) => c.changePct < 0);

  const withRoc = rows.filter((r) => r.rocPercent != null);
  const highestRoc = [...withRoc].sort((a, b) => (b.rocPercent ?? 0) - (a.rocPercent ?? 0)).slice(0, 5);
  const lowestRoc = [...withRoc].sort((a, b) => (a.rocPercent ?? 0) - (b.rocPercent ?? 0)).slice(0, 5);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      <Card title={T.increases[lang]}>
        {topIncreases.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">{T.none[lang]}</p>
        ) : (
          <ul>
            {topIncreases.map((c) => (
              <TickerLink key={c.ticker} ticker={c.ticker} basePath={basePath} value={`+${c.changePct.toFixed(1)}%`} />
            ))}
          </ul>
        )}
      </Card>
      <Card title={T.decreases[lang]}>
        {topDecreases.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">{T.none[lang]}</p>
        ) : (
          <ul>
            {topDecreases.map((c) => (
              <TickerLink key={c.ticker} ticker={c.ticker} basePath={basePath} value={`${c.changePct.toFixed(1)}%`} />
            ))}
          </ul>
        )}
      </Card>
      <Card title={T.highestRoc[lang]}>
        {highestRoc.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">{T.none[lang]}</p>
        ) : (
          <ul>
            {highestRoc.map((r) => (
              <TickerLink key={r.ticker} ticker={r.ticker} basePath={basePath} value={`${r.rocPercent!.toFixed(1)}%`} />
            ))}
          </ul>
        )}
      </Card>
      <Card title={T.lowestRoc[lang]}>
        {lowestRoc.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">{T.none[lang]}</p>
        ) : (
          <ul>
            {lowestRoc.map((r) => (
              <TickerLink key={r.ticker} ticker={r.ticker} basePath={basePath} value={`${r.rocPercent!.toFixed(1)}%`} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getTopByCradyScore, providerLabel } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF 랭킹",
  description: "CRADY 점수 기준 배당 ETF 랭킹.",
  alternates: { canonical: "https://crady.net/ranking" },
};

export default async function RankingPage() {
  const ranking = await getTopByCradyScore(50);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "랭킹", url: "https://crady.net/ranking" },
        ]}
      />
      <h1 className="text-2xl font-bold">배당 ETF 랭킹</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1">
        CRADY 점수 기준 상위 {ranking.length}개 ETF
      </p>

      <div className="mt-6 border border-[var(--gray-200)] rounded-xl overflow-hidden">
        {ranking.map((etf, i) => (
          <Link
            key={etf.ticker}
            href={`/${etf.ticker.toLowerCase()}`}
            className="flex items-center gap-4 px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
          >
            <span className="w-6 text-[var(--gray-400)] text-sm font-medium">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{etf.ticker}</div>
              <div className="text-xs text-[var(--gray-500)] truncate">
                {etf.name} · {providerLabel(etf.provider_id)}
              </div>
            </div>
            {etf.crady_score != null && (
              <span className="text-sm font-bold text-[var(--crady-accent)]">
                {etf.crady_score.toFixed(1)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

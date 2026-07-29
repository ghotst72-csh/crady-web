import {
  getHomeSnapshot,
  getThisWeekDividends,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topRecentlyIncreased,
  topByRiskEfficiency,
  topByProvider,
  providerLabel,
} from "@/lib/data";
import { EtfCard } from "@/components/EtfCard";
import { CardRow } from "@/components/CardRow";
import Link from "next/link";

export const revalidate = 3600;

const PROVIDERS = ["yieldmax", "roundhill", "defiance"];

export default async function HomePage() {
  const [snapshot, thisWeek] = await Promise.all([
    getHomeSnapshot(),
    getThisWeekDividends(8),
  ]);

  const heroTop = topByCradyScoreSnapshot(snapshot, 5);
  const yieldTop = topByAnnualYield(snapshot, 8);
  const cradyTop = topByCradyScoreSnapshot(snapshot, 8);
  const increased = topRecentlyIncreased(snapshot, 8);
  const efficient = topByRiskEfficiency(snapshot, 8);

  return (
    <div>
      {/* Compact intro — no big hero, no big search */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-2">
        <p className="text-sm text-[var(--gray-500)]">
          YieldMax · Roundhill · Defiance 고배당 ETF 실시간 배당·가격·CRADY 점수
        </p>
      </div>

      {/* Hero data section */}
      <CardRow title="지금 가장 강한 배당 ETF" moreHref="/ranking">
        {heroTop.map((etf) => (
          <EtfCard key={etf.ticker} etf={etf} />
        ))}
      </CardRow>

      <CardRow title="연환산 분배율 TOP" moreHref="/ranking">
        {yieldTop.map((etf) => (
          <EtfCard key={etf.ticker} etf={etf} />
        ))}
      </CardRow>

      <CardRow title="CRADY 점수 TOP" moreHref="/ranking">
        {cradyTop.map((etf) => (
          <EtfCard key={etf.ticker} etf={etf} />
        ))}
      </CardRow>

      {/* This week's dividend schedule — compact table, not cards */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">이번 주 배당 예정</h2>
          <Link
            href="/calendar"
            className="text-sm text-[var(--gray-500)] hover:text-black"
          >
            전체 일정 보기 →
          </Link>
        </div>
        <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
          {thisWeek.map((d, i) => (
            <Link
              key={`${d.ticker}-${i}`}
              href={`/${d.ticker.toLowerCase()}`}
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
            >
              <span className="font-semibold">{d.ticker}</span>
              <span className="text-sm text-[var(--gray-500)]">
                지급일 {d.pay_date}
              </span>
              <span className="text-sm font-medium">
                {d.amount != null ? `$${d.amount.toFixed(4)}` : "예정"}
              </span>
            </Link>
          ))}
          {thisWeek.length === 0 && (
            <div className="px-4 py-6 text-sm text-[var(--gray-400)] text-center">
              이번 주 예정된 배당이 없습니다.
            </div>
          )}
        </div>
      </section>

      {increased.length > 0 && (
        <CardRow title="최근 배당금이 증가한 ETF" moreHref="/ranking">
          {increased.map((etf) => (
            <EtfCard key={etf.ticker} etf={etf} />
          ))}
        </CardRow>
      )}

      {efficient.length > 0 && (
        <CardRow title="위험 대비 배당 효율 TOP" moreHref="/ranking">
          {efficient.map((etf) => (
            <EtfCard key={etf.ticker} etf={etf} />
          ))}
        </CardRow>
      )}

      {/* Provider sections */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
        <h2 className="text-lg font-bold mb-4">운용사별 상위 ETF</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {PROVIDERS.map((p) => {
            const top = topByProvider(snapshot, p, 4);
            if (top.length === 0) return null;
            return (
              <div key={p}>
                <h3 className="text-sm font-semibold text-[var(--gray-500)] mb-2">
                  {providerLabel(p)}
                </h3>
                <div className="flex flex-col gap-2">
                  {top.map((etf) => (
                    <Link
                      key={etf.ticker}
                      href={`/${etf.ticker.toLowerCase()}`}
                      className="flex items-center justify-between border border-[var(--gray-200)] rounded-lg px-3 py-2 text-sm hover:border-black transition-colors"
                    >
                      <span className="font-semibold">{etf.ticker}</span>
                      <span className="text-[var(--crady-accent)] font-bold">
                        {etf.cradyScore != null ? etf.cradyScore.toFixed(1) : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  sortDistributionRows,
  searchDistributionRows,
  filterDistributionRows,
  buildAvailableFilters,
  SORT_OPTIONS,
  type DistributionRow,
  type SortOption,
} from "@/lib/distributions/table";
import { providerLabel } from "@/lib/providers";

const T = {
  searchPlaceholder: { en: "Search ticker or ETF name...", ko: "티커 또는 ETF 이름 검색..." },
  searchLabel: { en: "Search distributions by ticker or ETF name", ko: "티커 또는 이름으로 분배금 검색" },
  sortLabel: { en: "Sort by", ko: "정렬 기준" },
  noResults: { en: "No distributions match your search or filter.", ko: "검색/필터 조건에 맞는 분배금이 없습니다." },
  popular: { en: "Popular:", ko: "인기:" },
  th: {
    ticker: { en: "Ticker", ko: "티커" },
    name: { en: "ETF Name", ko: "ETF 이름" },
    frequency: { en: "Frequency", ko: "지급 주기" },
    perShare: { en: "Distribution per Share", ko: "주당 분배금" },
    rate: { en: "Distribution Rate", ko: "분배율" },
    secYield: { en: "30-Day SEC Yield", ko: "30일 SEC 수익률" },
    roc: { en: "ROC", ko: "ROC" },
    exDate: { en: "Ex-Date", ko: "배당락일" },
    payDate: { en: "Payment Date", ko: "지급일" },
  },
  expand: { en: "Tap for details", ko: "탭하여 자세히 보기" },
  collapse: { en: "Tap to collapse", ko: "탭하여 접기" },
  source: { en: "Source", ko: "출처" },
  viewTicker: { en: "View ticker page →", ko: "티커 페이지 보기 →" },
  na: "—",
} as const;

const POPULAR_TICKERS = ["MSTY", "TSLY", "CONY", "NVDY"];

function fmtMoney(n: number | null): string {
  return n != null ? `$${n.toFixed(4)}` : T.na;
}
function fmtPct(n: number | null): string {
  return n != null ? `${n.toFixed(2)}%` : T.na;
}

export function DistributionExplorer({
  rows,
  lang = "en",
  basePath = "",
}: {
  rows: DistributionRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("ticker-asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const availableFilters = useMemo(() => buildAvailableFilters(rows), [rows]);
  const visibleRows = useMemo(() => {
    const filtered = filterDistributionRows(rows, filter);
    const searched = searchDistributionRows(filtered, query);
    return sortDistributionRows(searched, sort);
  }, [rows, filter, query, sort]);

  const popularPresent = POPULAR_TICKERS.filter((t) => rows.some((r) => r.ticker === t));

  function toggleExpanded(ticker: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  return (
    <div>
      {/* Controls — search, sort, filter chips (horizontal scroll on mobile,
          same pattern as the ticker page's Deep Dive chip row). */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="text"
          role="searchbox"
          aria-label={T.searchLabel[lang]}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={T.searchPlaceholder[lang]}
          className="w-full sm:w-72 px-3 py-2 text-sm rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] outline-none focus:bg-white focus:border-black transition-colors"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--gray-600)] shrink-0">
          {T.sortLabel[lang]}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-2 py-1.5 text-sm rounded-md border border-[var(--gray-200)] bg-white outline-none focus:border-black"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {lang === "ko" ? opt.ko : opt.en}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {availableFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
              filter === f.value
                ? "bg-black text-white border-black"
                : "border-[var(--gray-200)] text-[var(--gray-600)] hover:border-black"
            }`}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {popularPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--gray-500)]">
          <span>{T.popular[lang]}</span>
          {popularPresent.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setQuery(t)}
              className="px-2 py-0.5 rounded-full border border-[var(--gray-200)] hover:border-black transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {visibleRows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--gray-400)]">{T.noResults[lang]}</p>
      ) : (
        <>
          {/* Desktop — a real semantic table, sticky header. */}
          <div className="hidden sm:block mt-5 border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                  <tr>
                    <th scope="col" className="text-left px-4 py-2.5 font-medium">{T.th.ticker[lang]}</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-medium">{T.th.name[lang]}</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-medium">{T.th.frequency[lang]}</th>
                    <th scope="col" className="text-right px-4 py-2.5 font-medium">{T.th.perShare[lang]}</th>
                    <th scope="col" className="text-right px-4 py-2.5 font-medium">{T.th.rate[lang]}</th>
                    <th scope="col" className="text-right px-4 py-2.5 font-medium">{T.th.secYield[lang]}</th>
                    <th scope="col" className="text-right px-4 py-2.5 font-medium">{T.th.roc[lang]}</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-medium">{T.th.exDate[lang]}</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-medium">{T.th.payDate[lang]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {visibleRows.map((r) => (
                    <tr key={r.ticker} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-4 py-2.5 font-semibold">
                        <Link href={`${basePath}/${r.ticker.toLowerCase()}`} className="hover:underline">
                          {r.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--gray-600)] truncate max-w-[220px]">
                        {r.etfName ?? T.na}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--gray-600)]">{r.frequency ?? T.na}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtMoney(r.distributionPerShare)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtPct(r.distributionRate)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtPct(r.secYield30d)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtPct(r.rocPercent)}</td>
                      <td className="px-4 py-2.5 text-[var(--gray-600)]">{r.exDate}</td>
                      <td className="px-4 py-2.5 text-[var(--gray-600)]">{r.payDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — compact rows, tap to expand. */}
          <ul className="sm:hidden mt-5 border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)] overflow-hidden">
            {visibleRows.map((r) => {
              const isOpen = expanded.has(r.ticker);
              return (
                <li key={r.ticker}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(r.ticker)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left min-h-[44px]"
                  >
                    <span className="font-semibold">{r.ticker}</span>
                    <span className="flex-1 text-right text-sm font-medium">{fmtMoney(r.distributionPerShare)}</span>
                    <span className="w-16 shrink-0 text-right text-xs text-[var(--gray-500)]">{fmtPct(r.distributionRate)}</span>
                    <span className="w-20 shrink-0 text-right text-xs text-[var(--gray-500)]">{r.payDate}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-[var(--gray-700)] bg-[var(--gray-50)]">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.th.name[lang]}</dt>
                          <dd>{r.etfName ?? T.na}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.th.frequency[lang]}</dt>
                          <dd>{r.frequency ?? T.na}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.th.secYield[lang]}</dt>
                          <dd>{fmtPct(r.secYield30d)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.th.roc[lang]}</dt>
                          <dd>{fmtPct(r.rocPercent)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.th.exDate[lang]}</dt>
                          <dd>{r.exDate}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[var(--gray-500)]">{T.source[lang]}</dt>
                          <dd>{providerLabel(r.providerId)}</dd>
                        </div>
                      </dl>
                      <Link
                        href={`${basePath}/${r.ticker.toLowerCase()}`}
                        className="mt-3 inline-block text-sm font-medium text-[var(--crady-accent)] hover:underline"
                      >
                        {T.viewTicker[lang]}
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

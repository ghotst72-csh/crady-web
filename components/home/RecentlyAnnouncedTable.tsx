import Link from "next/link";
import { Megaphone } from "lucide-react";
import { providerLabel } from "@/lib/providers";
import type { RecentAnnouncedRow } from "@/lib/distributions/data";

/** Recently Announced (CRADY Homepage Final Redesign, 2026-08-12) — reuses
 * EtfTable's visual chrome but stays a separate component since its data
 * shape (RecentAnnouncedRow, sourced across several announcement batches
 * via getRecentAnnouncedDistributions) genuinely differs from EtfSnapshot. */
export function RecentlyAnnouncedTable({
  rows,
  lang = "en",
  basePath = "",
}: {
  rows: RecentAnnouncedRow[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const T = {
    title: { en: "Recently Announced", ko: "최근 발표" },
    viewAll: { en: "View All", ko: "전체 보기" },
    ticker: { en: "Ticker", ko: "티커" },
    amount: { en: "Amount", ko: "금액" },
    exDate: { en: "Ex-Date", ko: "락일" },
    payDate: { en: "Payment Date", ko: "지급일" },
    announced: { en: "Announced", ko: "발표일" },
  } as const;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
        <div className="flex items-center gap-2">
          <Megaphone size={16} strokeWidth={2} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[var(--gray-900)]">{T.title[lang]}</h2>
        </div>
        <Link href={`${basePath}/distributions`} className="text-xs font-semibold text-blue-600 hover:underline shrink-0">
          {T.viewAll[lang]} →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-[var(--gray-400)]">
              <th className="px-5 py-2 font-semibold text-left whitespace-nowrap">{T.ticker[lang]}</th>
              <th className="px-5 py-2 font-semibold text-right whitespace-nowrap">{T.amount[lang]}</th>
              <th className="px-5 py-2 font-semibold text-right whitespace-nowrap">{T.exDate[lang]}</th>
              <th className="px-5 py-2 font-semibold text-right whitespace-nowrap">{T.payDate[lang]}</th>
              <th className="px-5 py-2 font-semibold text-right whitespace-nowrap">{T.announced[lang]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {rows.map((row, i) => (
              <tr key={`${row.ticker}-${row.exDate}-${i}`} className="hover:bg-[var(--gray-50)] transition-colors">
                <td className="px-5 py-3 whitespace-nowrap">
                  <Link href={`${basePath}/${row.ticker.toLowerCase()}`} className="font-bold text-blue-700 hover:underline">
                    {row.ticker}
                  </Link>
                  <span className="block text-[11px] text-[var(--gray-400)] mt-0.5">
                    {providerLabel(row.providerId)}
                    {row.etfName ? ` · ${row.etfName}` : ""}
                  </span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap font-semibold text-[var(--gray-900)]">
                  {row.distributionPerShare != null ? `$${row.distributionPerShare.toFixed(4)}` : "—"}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap text-[var(--gray-600)]">{row.exDate}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap text-[var(--gray-600)]">{row.payDate}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap text-[var(--gray-500)]">{row.announcedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

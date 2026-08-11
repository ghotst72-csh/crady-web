import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { providerLabel } from "@/lib/providers";
import { normalizeConfidencePct, formatConfidencePct } from "@/lib/confidence";
import type { EtfSnapshot } from "@/lib/data";

export type EtfTableColumn = {
  header: string;
  align?: "left" | "right";
  render: (row: EtfSnapshot) => ReactNode;
};

/** Shared card+table chrome for the homepage's ETF-row tables (CRADY
 * Homepage Final Redesign, 2026-08-12) — Next Distributions, Highest
 * Yields, and CRADY Predictions all render through this one component
 * with different `columns`, rather than three near-duplicate
 * implementations. Ticker and ETF Name are always separate columns
 * (matching the approved design), not a combined ticker+subline cell. */
export function EtfTable({
  title,
  icon: Icon,
  viewAllHref,
  viewAllLabel,
  rows,
  columns,
  basePath = "",
}: {
  title: string;
  icon: LucideIcon;
  viewAllHref: string;
  viewAllLabel: string;
  rows: EtfSnapshot[];
  columns: EtfTableColumn[];
  basePath?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={2} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[var(--gray-900)]">{title}</h2>
        </div>
        <Link href={`${basePath}${viewAllHref}`} className="text-xs font-semibold text-blue-600 hover:underline shrink-0">
          {viewAllLabel} →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-[var(--gray-400)]">
              {columns.map((c) => (
                <th
                  key={c.header}
                  className={`px-5 py-2 font-semibold whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {rows.map((row) => (
              <tr key={row.ticker} className="hover:bg-[var(--gray-50)] transition-colors">
                {columns.map((c) => (
                  <td key={c.header} className={`px-5 py-3 whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TickerCell({ row, basePath = "" }: { row: EtfSnapshot; basePath?: string }) {
  return (
    <Link href={`${basePath}/${row.ticker.toLowerCase()}`} className="font-bold text-blue-700 hover:underline">
      {row.ticker}
    </Link>
  );
}

export function NameCell({ row }: { row: EtfSnapshot }) {
  return (
    <span className="text-[var(--gray-700)]">
      {providerLabel(row.provider_id)}
      {row.name ? ` · ${row.name}` : ""}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number | null }) {
  const label = formatConfidencePct(value, 0);
  if (value == null || label == null) return <span className="text-[var(--gray-400)]">—</span>;
  const pct = normalizeConfidencePct(value);
  return (
    <span className="inline-flex items-center gap-2 justify-end">
      <span className="w-14 h-1.5 rounded-full bg-[var(--gray-100)] overflow-hidden">
        <span className="block h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs font-semibold text-[var(--gray-700)] tabular-nums">{label}</span>
    </span>
  );
}

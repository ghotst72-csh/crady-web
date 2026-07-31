import Link from "next/link";

export type KpiSize = "lg" | "md" | "sm";

export type KpiItem = {
  label: string;
  value: string | number;
  href?: string;
  accent?: boolean;
  sublabel?: string;
  /** Visual weight, not just grid position — Visual Hierarchy Phase 2:
   * "6 cards with identical visual weight" was the flat-hierarchy problem.
   * Defaults to "md" (Phase 1's original single size) so any KpiGrid caller
   * that doesn't opt in renders pixel-identical to before. */
  size?: KpiSize;
};

/** The KPI-card pattern already proven on the homepage (components/
 * KeyMetrics.tsx) — generalized so every page's "answer the question in 3
 * seconds" dashboard uses the exact same visual language instead of each
 * page inventing its own stat-card style. */
export function KpiGrid({ items, columns = 4 }: { items: KpiItem[]; columns?: 2 | 3 | 4 }) {
  const colsClass =
    columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  return (
    <div className={`grid ${colsClass} gap-3`}>
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}

const VALUE_SIZE: Record<KpiSize, string> = {
  lg: "text-3xl sm:text-4xl font-black",
  md: "text-2xl font-extrabold",
  sm: "text-lg font-bold",
};
const LABEL_SIZE: Record<KpiSize, string> = {
  lg: "text-xs sm:text-[13px] mt-1",
  md: "text-xs mt-0.5",
  sm: "text-[11px] mt-0.5",
};
const CARD_PADDING: Record<KpiSize, string> = {
  lg: "px-5 py-4",
  md: "px-4 py-3",
  sm: "px-3 py-2.5",
};

/** Exported (not just used internally by KpiGrid) so pages that need a
 * deliberate size pyramid — Distribution KPIs, Calendar summary, Risk
 * Analysis stat grid — can compose bespoke multi-row layouts directly,
 * since a large/medium/small pyramid doesn't fit a single uniform-column
 * grid the way KpiGrid's other callers (Magazine highlights, etc.) do. */
export function KpiCard({ label, value, href, accent, sublabel, size = "md" }: KpiItem) {
  const content = (
    <>
      {/* #92400e, not the raw --crady-accent token, for text-on-white — see
          the CRADY Authority & Google Trust Phase 1 report for why: the
          brand accent (#f59e0b) itself fails WCAG contrast as text on a
          white background even at this size/weight. */}
      <div className={`${VALUE_SIZE[size]} ${accent ? "text-[#92400e]" : ""}`}>{value}</div>
      <div className={`${LABEL_SIZE[size]} text-[var(--gray-500)]`}>{label}</div>
      {sublabel && <div className="text-[11px] text-[var(--gray-600)] mt-1">{sublabel}</div>}
    </>
  );
  const className =
    `border border-[var(--gray-200)] rounded-xl ${CARD_PADDING[size]} transition-colors` +
    (href ? " hover:border-black hover:shadow-sm" : "");
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

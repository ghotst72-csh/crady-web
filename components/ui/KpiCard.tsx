import Link from "next/link";

export type KpiItem = {
  label: string;
  value: string | number;
  href?: string;
  accent?: boolean;
  sublabel?: string;
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

function KpiCard({ label, value, href, accent, sublabel }: KpiItem) {
  const content = (
    <>
      {/* #92400e, not the raw --crady-accent token, for text-on-white — see
          the CRADY Authority & Google Trust Phase 1 report for why: the
          brand accent (#f59e0b) itself fails WCAG contrast as text on a
          white background even at this size/weight. */}
      <div className={`text-2xl font-extrabold ${accent ? "text-[#92400e]" : ""}`}>{value}</div>
      <div className="text-xs text-[var(--gray-500)] mt-0.5">{label}</div>
      {sublabel && <div className="text-[11px] text-[var(--gray-600)] mt-1">{sublabel}</div>}
    </>
  );
  const className =
    "border border-[var(--gray-200)] rounded-xl px-4 py-3 transition-colors" +
    (href ? " hover:border-black" : "");
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

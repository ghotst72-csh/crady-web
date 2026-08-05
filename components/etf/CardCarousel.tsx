import Link from "next/link";
import type { ReactNode } from "react";

/** Design System 2.0, §5/§10 — the one shared horizontal-scroll shell used
 * for every Home-page card rail (Popular / Trending / Recently Declared /
 * High Income / Low Risk) and for Related ETFs on the ticker page. Snap
 * scroll, no JS carousel library — a plain scrollable flex row, consistent
 * with the site's dependency-free-first convention (see Sparkline). */
export function CardCarousel({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--gray-500)] mt-0.5">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs font-semibold text-[#92400e] hover:underline shrink-0">
            {viewAllLabel ?? "View all →"}
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-px-4">
        {children}
      </div>
    </section>
  );
}

export function CarouselItem({ children }: { children: ReactNode }) {
  return <div className="shrink-0 w-[260px] snap-start">{children}</div>;
}

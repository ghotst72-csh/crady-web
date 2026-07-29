import Link from "next/link";
import type { ReactNode } from "react";

export function CardRow({
  title,
  moreHref,
  children,
}: {
  title: string;
  moreHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)] first:border-t-0">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-sm text-[var(--gray-500)] hover:text-black"
          >
            더 보기 →
          </Link>
        )}
      </div>
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}

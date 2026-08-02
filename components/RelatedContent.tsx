import Link from "next/link";
import type { LinkItem } from "@/lib/magazine/links";

const T = {
  heading: { en: "Explore More", ko: "더 알아보기" },
  articles: { en: "Related Articles", ko: "관련 아티클" },
  etfs: { en: "Related ETFs", ko: "관련 ETF" },
  rankings: { en: "Related Rankings", ko: "관련 랭킹" },
  guides: { en: "Related Guides", ko: "관련 가이드" },
  nextReading: { en: "Next Reading", ko: "다음 읽을거리" },
} as const;

function LinkGroup({ label, items }: { label: string; items: LinkItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Internal Link Explosion (SEO Authority Phase 2) — every page a visitor
 * lands on fans out into five categorized groups instead of a single flat
 * row (the previous relatedLinksSection), so a reader never runs out of
 * "where do I go next." Renders nothing if every group is empty. */
export function RelatedContent({
  lang = "en",
  articles = [],
  etfs = [],
  rankings = [],
  guides = [],
  nextReading = null,
}: {
  lang?: "en" | "ko";
  articles?: LinkItem[];
  etfs?: LinkItem[];
  rankings?: LinkItem[];
  guides?: LinkItem[];
  nextReading?: LinkItem | null;
}) {
  const hasContent = articles.length > 0 || etfs.length > 0 || rankings.length > 0 || guides.length > 0 || nextReading;
  if (!hasContent) return null;

  return (
    <section className="mt-10 pt-8 border-t border-[var(--gray-200)]">
      <h2 className="text-lg font-bold mb-4">{T.heading[lang]}</h2>
      <div className="space-y-5">
        {nextReading && (
          <div>
            <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
              {T.nextReading[lang]}
            </div>
            <Link
              href={nextReading.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors"
            >
              {nextReading.label} →
            </Link>
          </div>
        )}
        <LinkGroup label={T.articles[lang]} items={articles} />
        <LinkGroup label={T.etfs[lang]} items={etfs} />
        <LinkGroup label={T.rankings[lang]} items={rankings} />
        <LinkGroup label={T.guides[lang]} items={guides} />
      </div>
    </section>
  );
}

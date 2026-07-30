import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllTickers } from "@/lib/data";
import { getArticleData } from "@/lib/magazine/data";
import { buildArticleMeta, buildSections } from "@/lib/magazine/recipes";
import { buildFaqItems } from "@/lib/magazine/faq";
import { buildInternalLinks } from "@/lib/magazine/links";
import { buildArticleJsonLd, buildFaqJsonLd } from "@/lib/magazine/jsonld";
import { relatedLinksSection } from "@/lib/magazine/sections";
import { resolveSlug } from "@/lib/magazine/slugs";
import { HUB_DEFINITIONS, HUB_IDS } from "@/lib/magazine/hubs";
import { ARTICLE_TYPE_SLUG } from "@/lib/magazine/recipes";
import type { ArticleTypeId } from "@/lib/magazine/types";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { EtfAppCta } from "@/components/EtfAppCta";
import { HubArticleList } from "@/components/magazine/HubArticleList";

export const revalidate = 3600;

const ALL_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];

export async function generateStaticParams() {
  const tickers = await getAllTickers();
  const articleSlugs = tickers.flatMap((t) =>
    ALL_TYPES.map((type) => ({ slug: `${t.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG[type]}` }))
  );
  const hubSlugs = HUB_IDS.map((slug) => ({ slug }));
  return [...hubSlugs, ...articleSlugs];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) return {};

  const url = `https://crady.net/magazine/${slug}`;

  if (resolved.kind === "hub") {
    const def = HUB_DEFINITIONS[resolved.hub];
    return {
      title: def.title,
      description: def.description,
      alternates: { canonical: url },
      openGraph: { title: def.title, description: def.description, url, type: "website" },
      twitter: { card: "summary_large_image", title: def.title, description: def.description },
    };
  }

  const data = await getArticleData(resolved.ticker);
  if (!data) return {};
  const meta = buildArticleMeta(data, resolved.type);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "article" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function MagazinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) notFound();

  if (resolved.kind === "hub") {
    return <HubPage slug={resolved.hub} />;
  }

  const data = await getArticleData(resolved.ticker);
  if (!data) notFound();

  const { ticker } = data;
  const type = resolved.type;
  const meta = buildArticleMeta(data, type);
  const sections = buildSections(data, type);
  const faqItems = buildFaqItems(data, type);
  const links = buildInternalLinks(data, type);
  const relatedSection = relatedLinksSection(data, links);
  const url = `https://crady.net/magazine/${slug}`;
  const lastUpdated = data.risk?.calculated_at ?? new Date().toISOString();

  const articleJsonLd = buildArticleJsonLd({
    headline: meta.h1,
    description: meta.description,
    url,
    datePublished: data.etf.created_at ?? lastUpdated,
    dateModified: lastUpdated,
  });
  const faqJsonLd = buildFaqJsonLd(faqItems);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Magazine", url: "https://crady.net/magazine" },
          { name: meta.h1, url },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <nav className="text-xs text-[var(--gray-400)] mb-4">
        <Link href="/magazine" className="hover:text-black">
          Magazine
        </Link>{" "}
        / {ticker}
      </nav>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{meta.h1}</h1>
      <p className="mt-2 text-sm text-[var(--gray-500)]">
        Updated {lastUpdated.slice(0, 10)} ·{" "}
        <Link href={`/${ticker.toLowerCase()}`} className="underline hover:text-black">
          View full {ticker} profile
        </Link>
      </p>

      <div className="mt-8 space-y-10">
        {sections.map((section) => (
          <section key={section.id}>
            {section.id !== "next-dividend-highlight" && (
              <h2 className="text-lg sm:text-xl font-bold mb-3">{section.heading}</h2>
            )}
            <div className="text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
              {section.body}
            </div>
          </section>
        ))}

        {relatedSection && (
          <section>
            <h2 className="text-lg sm:text-xl font-bold mb-3">{relatedSection.heading}</h2>
            {relatedSection.body}
          </section>
        )}
      </div>

      <EtfAppCta ticker={ticker} />
    </div>
  );
}

async function HubPage({ slug }: { slug: keyof typeof HUB_DEFINITIONS }) {
  const def = HUB_DEFINITIONS[slug];
  const url = `https://crady.net/magazine/${slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Magazine", url: "https://crady.net/magazine" },
          { name: def.h1, url },
        ]}
      />
      <nav className="text-xs text-[var(--gray-400)] mb-4">
        <Link href="/magazine" className="hover:text-black">
          Magazine
        </Link>{" "}
        / {def.h1}
      </nav>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{def.h1}</h1>
      <p className="mt-2 text-sm text-[var(--gray-600)] max-w-2xl">{def.description}</p>

      <div className="mt-8">
        <HubArticleList hubSlug={slug} />
      </div>
    </div>
  );
}

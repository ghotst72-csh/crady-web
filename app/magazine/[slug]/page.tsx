import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllTickers, providerLabel } from "@/lib/data";
import { getArticleData, getComparisonPeersData } from "@/lib/magazine/data";
import { buildArticleMeta, buildSections } from "@/lib/magazine/recipes";
import { buildFaqItems, buildFaqItemsKo } from "@/lib/magazine/faq";
import { buildInternalLinks } from "@/lib/magazine/links";
import { buildArticleJsonLd, buildFaqJsonLd, buildWebPageJsonLd, buildDatasetJsonLd } from "@/lib/magazine/jsonld";
import { relatedLinksSection } from "@/lib/magazine/sections";
import { hasRiskContent, hasFutureSchedule, hasDistributionOrStrategyContent } from "@/lib/magazine/quality";
import { pickComparisonPeerTicker, pickComparisonPeerTickers } from "@/lib/magazine/comparison";
import { resolveSlug } from "@/lib/magazine/slugs";
import { HUB_DEFINITIONS, HUB_IDS } from "@/lib/magazine/hubs";
import { CALENDAR_HUB_DEFINITIONS, CALENDAR_HUB_IDS, type CalendarHubId } from "@/lib/magazine/calendarHubs";
import { STANDALONE_PAGES, STANDALONE_PAGE_IDS, type StandalonePageId } from "@/lib/magazine/standalone";
import { ARTICLE_TYPE_SLUG } from "@/lib/magazine/recipes";
import type { ArticleTypeId } from "@/lib/magazine/types";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { EtfAppCta } from "@/components/EtfAppCta";
import { HubArticleList } from "@/components/magazine/HubArticleList";

export const revalidate = 3600;

const ALL_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];
// comparison pages are generated per-ticker only when a same-provider peer
// exists (pickComparisonPeerTicker) — every other type applies to all
// tickers unconditionally.
const UNCONDITIONAL_TYPES = ALL_TYPES.filter((t) => t !== "comparison");

export async function generateStaticParams() {
  const tickers = await getAllTickers();
  const articleSlugs = tickers.flatMap((t) =>
    UNCONDITIONAL_TYPES.map((type) => ({ slug: `${t.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG[type]}` }))
  );
  const comparisonSlugs = tickers
    .filter((t) => pickComparisonPeerTicker(t.ticker, t.provider_id, tickers) != null)
    .map((t) => ({ slug: `${t.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG.comparison}` }));
  const hubSlugs = HUB_IDS.map((slug) => ({ slug }));
  const calendarHubSlugs = CALENDAR_HUB_IDS.map((slug) => ({ slug }));
  const standaloneSlugs = STANDALONE_PAGE_IDS.map((slug) => ({ slug }));
  return [...hubSlugs, ...calendarHubSlugs, ...standaloneSlugs, ...articleSlugs, ...comparisonSlugs];
}

/** Up to 3 same-provider peers, round-robin-picked (lib/magazine/
 * comparison.ts) — feeds both the full comparison page's table and
 * next-dividend-prediction's quick-compare teaser (a shorter slice of the
 * same list, not a separately-fetched set). */
async function resolveComparisonPeers(ticker: string) {
  const tickers = await getAllTickers();
  const self = tickers.find((t) => t.ticker === ticker);
  if (!self) return [];
  const peerTickers = pickComparisonPeerTickers(ticker, self.provider_id, tickers, 3);
  if (peerTickers.length === 0) return [];
  return getComparisonPeersData(peerTickers);
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

  if (resolved.kind === "calendar-hub") {
    const def = CALENDAR_HUB_DEFINITIONS[resolved.hub];
    return {
      title: def.title,
      description: def.description,
      alternates: { canonical: url },
      openGraph: { title: def.title, description: def.description, url, type: "website" },
      twitter: { card: "summary_large_image", title: def.title, description: def.description },
    };
  }

  if (resolved.kind === "standalone") {
    const def = STANDALONE_PAGES[resolved.page];
    return {
      title: def.title,
      description: def.description,
      alternates: { canonical: url },
      openGraph: { title: def.title, description: def.description, url, type: "article" },
      twitter: { card: "summary_large_image", title: def.title, description: def.description },
    };
  }

  const data = await getArticleData(resolved.ticker);
  if (!data) return {};

  const peers = resolved.type === "comparison" ? await resolveComparisonPeers(data.ticker) : undefined;
  if (resolved.type === "comparison" && (!peers || peers.length === 0)) return {};

  const meta = buildArticleMeta(data, resolved.type, { peers });

  // A risk-analysis page for a ticker with zero risk data, a
  // dividend-calendar page with no published future schedule, or a
  // dividend-guide/dividend-history page for a ticker with no paid
  // distributions and no strategy copy, is nothing but FAQ boilerplate —
  // thin, not indexable, even though the URL itself stays live. sitemap.ts
  // applies the same rules from the bulk snapshot so the URL isn't
  // submitted either.
  const thin =
    (resolved.type === "risk-analysis" && !hasRiskContent(data.risk)) ||
    (resolved.type === "dividend-calendar" && !hasFutureSchedule(data.futureSchedule)) ||
    ((resolved.type === "dividend-guide" || resolved.type === "dividend-history") &&
      !hasDistributionOrStrategyContent(data));

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    robots: thin ? { index: false, follow: true } : undefined,
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

  if (resolved.kind === "calendar-hub") {
    return <CalendarHubPage slug={resolved.hub} />;
  }

  if (resolved.kind === "standalone") {
    return <StandalonePage slug={resolved.page} />;
  }

  const data = await getArticleData(resolved.ticker);
  if (!data) notFound();

  const { ticker } = data;
  const type = resolved.type;

  // Independent of `type` (only depends on the ticker), so fetched once and
  // reused to render the comparison page's table, next-dividend-prediction's
  // quick-compare teaser, and to decide whether OTHER pages for this ticker
  // should link to a comparison page at all.
  const comparisonPeers = await resolveComparisonPeers(ticker);
  if (type === "comparison" && comparisonPeers.length === 0) notFound();

  const meta = buildArticleMeta(data, type, { peers: comparisonPeers });
  const sections = buildSections(data, type, { peers: comparisonPeers });
  const faqItems = buildFaqItems(data, type, { peers: comparisonPeers });
  const faqItemsKo = buildFaqItemsKo(data, type, { peers: comparisonPeers });
  const links = buildInternalLinks(data, type, {
    comparisonPeerTicker: comparisonPeers[0]?.ticker ?? null,
  });
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
  const faqJsonLd = buildFaqJsonLd([...faqItems, ...faqItemsKo]);
  const webPageJsonLd = buildWebPageJsonLd({
    name: meta.h1,
    description: meta.description,
    url,
    speakableSelectors:
      type === "next-dividend-prediction" ? ["#featured-snippet", "#ai-summary"] : undefined,
  });
  // Dataset schema for the real historical distribution table this page
  // shows (next-dividend-prediction's row table) — only when there's
  // actual tabular data behind it, not a generic Dataset stub.
  const datasetJsonLd =
    type === "next-dividend-prediction" && data.distributions.length > 0
      ? buildDatasetJsonLd({
          name: `${ticker} Dividend Distribution History`,
          description: `Historical ex-dividend dates, payment dates, and per-share amounts for ${ticker}.`,
          url,
        })
      : null;

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      {datasetJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
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

      <div id="magazine-article-body" className="mt-8 space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            {section.id !== "next-dividend-highlight" && section.id !== "featured-snippet" && (
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

async function CalendarHubPage({ slug }: { slug: CalendarHubId }) {
  const def = CALENDAR_HUB_DEFINITIONS[slug];
  const url = `https://crady.net/magazine/${slug}`;
  const events = await def.fetcher();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
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
        {events.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)]">No upcoming dates in this range yet.</p>
        ) : (
          <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Ticker</th>
                  <th className="text-left px-4 py-2 font-medium">Provider</th>
                  <th className="text-left px-4 py-2 font-medium">Ex-Date</th>
                  <th className="text-left px-4 py-2 font-medium">Pay Date</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {events.map((e, i) => (
                  <tr key={`${e.ticker}-${e.pay_date}-${i}`}>
                    <td className="px-4 py-2 font-semibold">
                      <Link
                        href={`/magazine/${e.ticker.toLowerCase()}-next-dividend-prediction`}
                        className="hover:underline"
                      >
                        {e.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[var(--gray-500)]">{providerLabel(e.provider_id)}</td>
                    <td className="px-4 py-2">{e.ex_date}</td>
                    <td className="px-4 py-2">{e.pay_date}</td>
                    <td className="px-4 py-2 text-right">{e.amount != null ? `$${e.amount.toFixed(4)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

async function StandalonePage({ slug }: { slug: StandalonePageId }) {
  const def = STANDALONE_PAGES[slug];
  const url = `https://crady.net/magazine/${slug}`;
  const faqJsonLd = buildFaqJsonLd(def.faqItems);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Magazine", url: "https://crady.net/magazine" },
          { name: def.h1, url },
        ]}
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
        / {def.h1}
      </nav>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{def.h1}</h1>

      <div id="magazine-article-body" className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--gray-700)]">
        {def.body}

        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">Frequently Asked Questions</h2>
          <div className="not-prose divide-y divide-[var(--gray-100)]">
            {def.faqItems.map((item) => (
              <div key={item.question} className="py-4 first:pt-0">
                <div className="font-semibold text-sm">{item.question}</div>
                <p className="mt-1.5 text-sm text-[var(--gray-600)]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import type { FaqItem } from "./types";

export function buildArticleJsonLd(opts: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: { "@type": "Organization", name: "CRADY" },
    publisher: {
      "@type": "Organization",
      name: "CRADY",
      logo: { "@type": "ImageObject", url: "https://crady.net/icon-512.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
  };
}

/** A real, correct schema.org type (unlike "Table", which isn't a
 * standalone type Google acts on, or "FinancialService", which would
 * misrepresent CRADY as a financial-services provider rather than an
 * information site — neither is added; see the Magazine 3.0 report).
 * `speakableSelectors` (Magazine 4.0), when given, adds a
 * SpeakableSpecification pointing at the page's self-contained,
 * factual passages (the featured-snippet lead and the rule-based AI
 * summary) — the two blocks written specifically to stand alone out of
 * context, which is what both voice/speakable extraction and Featured
 * Snippet / AI Overview selection need. Never pointed at FAQ or table
 * markup, which read poorly out of context. */
export function buildWebPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  speakableSelectors?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: { "@type": "WebSite", name: "CRADY", url: "https://crady.net" },
    ...(opts.speakableSelectors && opts.speakableSelectors.length > 0
      ? {
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: opts.speakableSelectors,
          },
        }
      : {}),
  };
}

/** Marks the page's historical distribution table as a Dataset — a real,
 * Google Dataset Search-eligible type, only emitted when the page actually
 * renders that table (see the datasetJsonLd guard in [slug]/page.tsx). */
export function buildDatasetJsonLd(opts: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    creator: { "@type": "Organization", name: "CRADY" },
  };
}

export function buildFaqJsonLd(items: FaqItem[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

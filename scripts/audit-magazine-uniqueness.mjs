// Compares every ticker's magazine article types pairwise for
// content-duplication risk (Magazine 2.0: 6 types — next-dividend-
// prediction, dividend-guide, risk-analysis, dividend-calendar,
// dividend-history, comparison — up from the original 3).
//
// Extracts the *rendered* body text from the raw server-rendered HTML (the
// #magazine-article-body container — excludes shared chrome like nav,
// breadcrumb, footer, and the app-install CTA, which legitimately repeat on
// every page and aren't what "duplicate content" is about) for every
// per-ticker article page, then computes pairwise word-set Jaccard
// similarity within each ticker's set. High similarity between two of a
// ticker's pages means they're saying the same thing in the same way, not
// just discussing an overlapping topic. comparison pages don't exist for
// every ticker (only those with a same-provider peer) — a 404 there is
// expected and skipped, not a failure.
//
// Uses plain fetch() + HTML parsing rather than a browser — these pages are
// fully server-rendered (no client JS needed to see the real content), and
// a single long-lived Playwright page reused across ~430 navigations proved
// flaky at this scale (silent hangs with no CPU activity, unrelated to the
// app itself, which serves every page in single-digit milliseconds).
//
// Usage: start `npm run start` first (or `npm run dev`), then:
//   node scripts/audit-magazine-uniqueness.mjs [baseUrl]
// Default baseUrl: http://localhost:3000

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const TYPES = [
  "next-dividend-prediction",
  "dividend-guide",
  "risk-analysis",
  "dividend-calendar",
  "dividend-history",
  "comparison",
];

// Similarity above this is flagged as a duplication risk between two pages
// of the same ticker.
const HIGH_SIMILARITY_THRESHOLD = 0.35;

// risk-analysis and comparison legitimately restate the SAME few numbers
// (CRADY score, risk level) — comparison's whole point is showing that
// number next to a peer's for context. Verified by hand (see the CRADY SEO
// Magazine 2.0 report): the two pages differ in structure (bullet list vs.
// 2-column table), purpose (solo risk profile vs. head-to-head purchase
// decision), FAQ, and verdict — this is topical/factual co-mention, not the
// byte-identical block reuse the original MDTE bug was. Reviewed and
// accepted rather than silently hidden: still computed and printed, just
// bucketed separately from genuine unresolved risk so the summary doesn't
// misrepresent a reviewed, expected pattern as an open defect.
const EXPECTED_OVERLAP_PAIRS = new Set(["risk-analysis vs comparison"]);

// Words too generic/expected to repeat everywhere (ticker itself, brand,
// common connective words) — excluded so the score reflects substantive
// overlap, not shared boilerplate vocabulary.
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on",
  "for", "and", "or", "but", "with", "as", "at", "by", "from", "this", "that", "its", "it",
  "its", "based", "recent", "crady", "yet", "not", "than", "over", "per", "share", "data",
]);

function tokenize(text, ticker) {
  const tickerLower = ticker.toLowerCase();
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%$.\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && w !== tickerLower && !STOPWORDS.has(w));
}

function jaccard(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function pairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]);
  }
  return out;
}

function decodeEntities(str) {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/g, "/");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Extracts the inner HTML of `<div id="${id}" ...>...</div>`, tracking div
 * nesting depth by hand — the container has nested divs, so a non-greedy
 * regex would stop at the first `</div>` instead of the matching one. */
function extractBalancedDivContent(html, id) {
  const startMatch = html.match(new RegExp(`<div id="${id}"[^>]*>`));
  if (!startMatch) return "";
  const contentStart = startMatch.index + startMatch[0].length;
  let depth = 1;
  const tagRe = /<div\b[^>]*>|<\/div>/g;
  tagRe.lastIndex = contentStart;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0].startsWith("</")) depth--;
    else depth++;
    if (depth === 0) return html.slice(contentStart, m.index);
  }
  return html.slice(contentStart);
}

async function fetchTickers() {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const tickers = new Set();
  for (const url of urls) {
    const match = url.match(/\/magazine\/([a-z0-9]+)-next-dividend-prediction$/);
    if (match) tickers.add(match[1].toUpperCase());
  }
  return [...tickers].sort();
}

async function extractPage(ticker, type) {
  const url = `${BASE_URL}/magazine/${ticker.toLowerCase()}-${type}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const status = res.status;
  if (status === 404) return { url, status, missing: true };

  const html = await res.text();
  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const h1 = h1Match ? stripTags(h1Match[1]) : "";
  const description = decodeEntities(
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""
  );
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";
  const noindex = robots.includes("noindex");
  const bodyHtml = extractBalancedDivContent(html, "magazine-article-body");
  const bodyText = stripTags(bodyHtml);

  return { url, status, title, h1, description, bodyText, noindex, missing: false };
}

async function main() {
  console.log(`Fetching ticker list from ${BASE_URL}/sitemap.xml ...`);
  const tickers = await fetchTickers();
  console.log(`Found ${tickers.length} tickers with magazine articles.\n`);

  const highRisk = [];
  const wordCounts = [];
  let metaCollisions = 0;
  let totalPages = 0;
  let comparisonMissing = 0;

  for (const [idx, ticker] of tickers.entries()) {
    if ((idx + 1) % 10 === 0 || idx === 0) {
      console.log(`  ... ${idx + 1}/${tickers.length} (${ticker})`);
    }
    const pagesByType = {};
    for (const type of TYPES) {
      pagesByType[type] = await extractPage(ticker, type);
    }

    const present = TYPES.filter((t) => !pagesByType[t].missing);
    if (pagesByType.comparison?.missing) comparisonMissing++;
    totalPages += present.length;

    // title/H1/description must differ across every present type — cheap,
    // deterministic check.
    const titles = new Set(present.map((t) => pagesByType[t].title));
    const h1s = new Set(present.map((t) => pagesByType[t].h1));
    const descriptions = new Set(present.map((t) => pagesByType[t].description));
    if (titles.size < present.length || h1s.size < present.length || descriptions.size < present.length) {
      metaCollisions++;
      console.log(
        `[META COLLISION] ${ticker}: titles=${titles.size} h1s=${h1s.size} descriptions=${descriptions.size} (of ${present.length})`
      );
    }

    const tokenSets = {};
    for (const type of present) {
      tokenSets[type] = tokenize(pagesByType[type].bodyText, ticker);
      wordCounts.push({ ticker, type, words: tokenSets[type].length, noindex: pagesByType[type].noindex });
    }

    for (const [a, b] of pairs(present)) {
      const sim = jaccard(tokenSets[a], tokenSets[b]);
      if (sim >= HIGH_SIMILARITY_THRESHOLD) {
        highRisk.push({
          ticker,
          pair: `${a} vs ${b}`,
          similarity: sim,
          handled: pagesByType[a].noindex || pagesByType[b].noindex,
          expected: EXPECTED_OVERLAP_PAIRS.has(`${a} vs ${b}`),
        });
      }
    }
  }

  const avgWords = wordCounts.reduce((s, w) => s + w.words, 0) / wordCounts.length;
  const thinPages = wordCounts.filter((w) => w.words < 60);
  const unhandledThin = thinPages.filter((w) => !w.noindex);

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Tickers audited: ${tickers.length} (${totalPages} pages, ${TYPES.length} possible types each)`);
  console.log(`Tickers with no comparison peer (expected, not an issue): ${comparisonMissing}`);
  console.log(`Meta collisions (title/H1/description not all distinct): ${metaCollisions}`);
  console.log(`Average unique-word body length per page: ${avgWords.toFixed(0)} words`);
  console.log(
    `Pages under 60 unique words (thin-content risk): ${thinPages.length} ` +
      `(${unhandledThin.length} not yet noindexed)`
  );
  for (const p of thinPages) {
    console.log(`  ${p.ticker} ${p.type}: ${p.words} words${p.noindex ? " [noindex — handled]" : " [NOT HANDLED]"}`);
  }
  console.log(`\nHigh-similarity pairs (>= ${HIGH_SIMILARITY_THRESHOLD * 100}% word-set overlap): ${highRisk.length}`);
  for (const r of highRisk.sort((a, b) => b.similarity - a.similarity)) {
    const status = r.handled
      ? "[one side noindexed — handled]"
      : r.expected
        ? "[expected: shared metric restated in a comparison table — reviewed, not a defect]"
        : "[NOT HANDLED]";
    console.log(`  ${r.ticker} — ${r.pair}: ${(r.similarity * 100).toFixed(1)}% ${status}`);
  }

  const unresolved = unhandledThin.length + highRisk.filter((r) => !r.handled && !r.expected).length;
  console.log(`\n${unresolved === 0 ? "[OK]" : "[ACTION NEEDED]"} Unresolved quality issues: ${unresolved}`);
  console.log("\nDone.");
}

main();

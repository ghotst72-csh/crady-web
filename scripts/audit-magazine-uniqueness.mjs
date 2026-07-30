// Compares every ticker's 3 magazine article types (next-dividend-prediction,
// dividend-guide, risk-analysis) pairwise for content-duplication risk.
//
// Extracts the *rendered* body text (via Playwright, from the
// #magazine-article-body container — excludes shared chrome like nav,
// breadcrumb, footer, and the app-install CTA, which legitimately repeat on
// every page and aren't what "duplicate content" is about) for all 216
// per-ticker article pages, then computes pairwise word-set Jaccard
// similarity within each ticker's trio. High similarity between two of a
// ticker's pages means they're saying the same thing in the same way, not
// just discussing an overlapping topic.
//
// Usage: start `npm run start` first (or `npm run dev`), then:
//   node scripts/audit-magazine-uniqueness.mjs [baseUrl]
// Default baseUrl: http://localhost:3000

import { chromium } from "playwright";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const TYPES = ["next-dividend-prediction", "dividend-guide", "risk-analysis"];

// Similarity above this is flagged as a duplication risk between two pages
// of the same ticker.
const HIGH_SIMILARITY_THRESHOLD = 0.35;

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

async function extractPage(page, ticker, type) {
  const url = `${BASE_URL}/magazine/${ticker.toLowerCase()}-${type}`;
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  const status = res?.status() ?? 0;
  const title = await page.title();
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content")
    .catch(() => "");
  const bodyText = await page
    .locator("#magazine-article-body")
    .innerText()
    .catch(() => "");
  const firstParagraph = bodyText.split("\n").find((l) => l.trim().length > 40) ?? "";
  const robots = await page
    .locator('meta[name="robots"]')
    .getAttribute("content")
    .catch(() => null);
  const noindex = (robots ?? "").includes("noindex");

  return { url, status, title, h1, description, bodyText, firstParagraph, noindex };
}

async function main() {
  console.log(`Fetching ticker list from ${BASE_URL}/sitemap.xml ...`);
  const tickers = await fetchTickers();
  console.log(`Found ${tickers.length} tickers with magazine articles.\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const highRisk = [];
  const wordCounts = [];
  let metaCollisions = 0;

  for (const ticker of tickers) {
    const pages = {};
    for (const type of TYPES) {
      pages[type] = await extractPage(page, ticker, type);
    }

    // title/H1/description must differ across all 3 — cheap, deterministic check.
    const titles = new Set(TYPES.map((t) => pages[t].title));
    const h1s = new Set(TYPES.map((t) => pages[t].h1));
    const descriptions = new Set(TYPES.map((t) => pages[t].description));
    if (titles.size < 3 || h1s.size < 3 || descriptions.size < 3) {
      metaCollisions++;
      console.log(`[META COLLISION] ${ticker}: titles=${titles.size} h1s=${h1s.size} descriptions=${descriptions.size}`);
    }

    const tokenSets = {};
    for (const type of TYPES) {
      tokenSets[type] = tokenize(pages[type].bodyText, ticker);
      wordCounts.push({ ticker, type, words: tokenSets[type].length, noindex: pages[type].noindex });
    }

    const pairs = [
      ["next-dividend-prediction", "dividend-guide"],
      ["next-dividend-prediction", "risk-analysis"],
      ["dividend-guide", "risk-analysis"],
    ];

    for (const [a, b] of pairs) {
      const sim = jaccard(tokenSets[a], tokenSets[b]);
      if (sim >= HIGH_SIMILARITY_THRESHOLD) {
        highRisk.push({
          ticker,
          pair: `${a} vs ${b}`,
          similarity: sim,
          handled: pages[a].noindex || pages[b].noindex,
        });
      }
    }
  }

  await browser.close();

  const avgWords = wordCounts.reduce((s, w) => s + w.words, 0) / wordCounts.length;
  const thinPages = wordCounts.filter((w) => w.words < 60);
  const unhandledThin = thinPages.filter((w) => !w.noindex);

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Tickers audited: ${tickers.length} (${tickers.length * 3} pages)`);
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
    console.log(
      `  ${r.ticker} — ${r.pair}: ${(r.similarity * 100).toFixed(1)}%${r.handled ? " [one side noindexed — handled]" : " [NOT HANDLED]"}`
    );
  }

  const unresolved = unhandledThin.length + highRisk.filter((r) => !r.handled).length;
  console.log(`\n${unresolved === 0 ? "[OK]" : "[ACTION NEEDED]"} Unresolved quality issues: ${unresolved}`);
  console.log("\nDone.");
}

main();

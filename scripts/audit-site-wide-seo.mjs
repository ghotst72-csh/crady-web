// Full-site GSC-readiness sweep — every URL in the sitemap, not just the
// Magazine subsystem (scripts/audit-magazine-uniqueness.mjs already covers
// that in depth). Checks: HTTP status, duplicate titles, duplicate
// descriptions, missing/malformed canonical, canonical pointing to a
// different URL than the one fetched (a canonical "loop" or drift bug),
// and a coarse soft-404 signal (200 status with a suspiciously short body).
//
// Usage: start `npm run start` first, then:
//   node scripts/audit-site-wide-seo.mjs [baseUrl]

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

function decodeEntities(str) {
  return str
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchSitemapUrls() {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}

async function checkPage(url) {
  const localUrl = url.replace("https://crady.net", BASE_URL);
  const res = await fetch(localUrl, { signal: AbortSignal.timeout(15000) });
  const status = res.status;
  const html = await res.text();

  const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = decodeEntities(
    html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""
  );
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? null;
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";
  const noindex = robots.includes("noindex");
  // Rough soft-404 signal: a 200 response whose <body> collapses to almost
  // nothing once tags are stripped. Threshold is intentionally low (real
  // thin-content grading already happens in audit-magazine-uniqueness.mjs
  // and audit-search-intent.mjs) — this only catches a page that's
  // basically blank, which sitemap URLs should never be.
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { url, status, title, description, canonical, noindex, bodyLength: bodyText.length };
}

async function main() {
  console.log(`Fetching sitemap from ${BASE_URL}/sitemap.xml ...`);
  const urls = await fetchSitemapUrls();
  console.log(`Found ${urls.length} URLs.\n`);

  const results = [];
  for (const [idx, url] of urls.entries()) {
    if ((idx + 1) % 50 === 0 || idx === 0) console.log(`  ... ${idx + 1}/${urls.length}`);
    try {
      results.push(await checkPage(url));
    } catch (err) {
      results.push({ url, status: 0, title: "", description: "", canonical: null, noindex: false, bodyLength: 0, error: String(err) });
    }
  }

  const nonOk = results.filter((r) => r.status !== 200);
  const noCanonical = results.filter((r) => r.status === 200 && !r.canonical);
  const canonicalMismatch = results.filter(
    (r) => r.status === 200 && r.canonical && r.canonical !== r.url
  );
  const thin = results.filter((r) => r.status === 200 && !r.noindex && r.bodyLength < 200);

  const titleMap = new Map();
  const descMap = new Map();
  for (const r of results) {
    if (r.status !== 200) continue;
    if (r.title) {
      if (!titleMap.has(r.title)) titleMap.set(r.title, []);
      titleMap.get(r.title).push(r.url);
    }
    if (r.description) {
      if (!descMap.has(r.description)) descMap.set(r.description, []);
      descMap.get(r.description).push(r.url);
    }
  }
  const dupTitles = [...titleMap.entries()].filter(([, urls]) => urls.length > 1);
  const dupDescs = [...descMap.entries()].filter(([, urls]) => urls.length > 1);

  console.log("\n" + "=".repeat(70));
  console.log("SITE-WIDE GSC READINESS SWEEP");
  console.log("=".repeat(70));
  console.log(`URLs checked: ${results.length}`);
  console.log(`Non-200 status (should be 0 — every sitemap URL must resolve): ${nonOk.length}`);
  for (const r of nonOk) console.log(`  ${r.url}: ${r.status}${r.error ? ` (${r.error})` : ""}`);

  console.log(`\nMissing canonical tag: ${noCanonical.length}`);
  for (const r of noCanonical) console.log(`  ${r.url}`);

  console.log(`\nCanonical points to a different URL than fetched (drift/loop risk): ${canonicalMismatch.length}`);
  for (const r of canonicalMismatch) console.log(`  ${r.url} -> canonical: ${r.canonical}`);

  console.log(`\nSoft-404 risk (200 status, <200 chars of body text, not noindexed): ${thin.length}`);
  for (const r of thin) console.log(`  ${r.url} (${r.bodyLength} chars)`);

  console.log(`\nDuplicate titles across distinct URLs: ${dupTitles.length}`);
  for (const [title, urls] of dupTitles) {
    console.log(`  "${title}"`);
    for (const u of urls) console.log(`    ${u}`);
  }

  console.log(`\nDuplicate descriptions across distinct URLs: ${dupDescs.length}`);
  for (const [desc, urls] of dupDescs) {
    console.log(`  "${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}"`);
    for (const u of urls) console.log(`    ${u}`);
  }

  const unresolved =
    nonOk.length + noCanonical.length + canonicalMismatch.length + thin.length + dupTitles.length + dupDescs.length;
  console.log(`\n${unresolved === 0 ? "[OK]" : "[ACTION NEEDED]"} Unresolved issues: ${unresolved}`);
  console.log("\nDone.");
}

main();

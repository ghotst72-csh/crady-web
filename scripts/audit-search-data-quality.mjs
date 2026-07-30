// Part F of the CRADY International SEO + Instant Ticker Search spec:
// audits the actual data source behind the header search (the etfs table,
// via the same public anon-key REST access lib/data.ts uses) for the
// specific failure modes that would let a search result point nowhere —
// duplicate tickers, null/placeholder names, null issuers, inconsistent
// casing — then verifies every ticker the search index would surface
// resolves to a real 200 page at both its EN and KO routes.
//
// Usage: start `npm run start` first, then:
//   node scripts/audit-search-data-quality.mjs [baseUrl]
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
// .env.local (same public, RLS-protected anon key the app itself uses —
// no service-role credential is ever read or required).

import { readFileSync } from "node:fs";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
    const env = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnvLocal(), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchAllEtfs() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/etfs?select=ticker,name,provider_id,payout_frequency`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function checkRoute(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return res.status;
  } catch (err) {
    return `ERROR: ${err}`;
  }
}

async function main() {
  console.log("Fetching live etfs table (public anon key, same access the app uses)...");
  const rows = await fetchAllEtfs();
  console.log(`Found ${rows.length} rows.\n`);

  // --- Data quality checks ---
  const tickerCounts = new Map();
  for (const r of rows) tickerCounts.set(r.ticker, (tickerCounts.get(r.ticker) ?? 0) + 1);
  const duplicates = [...tickerCounts.entries()].filter(([, c]) => c > 1);

  const missingName = rows.filter((r) => !r.name || r.name.trim() === "");
  const missingIssuer = rows.filter((r) => !r.provider_id || r.provider_id.trim() === "");
  const inconsistentCasing = rows.filter((r) => r.ticker !== r.ticker.toUpperCase());
  const knownProviders = new Set(["yieldmax", "roundhill", "defiance"]);
  const unknownProvider = rows.filter((r) => r.provider_id && !knownProviders.has(r.provider_id));

  console.log("=".repeat(70));
  console.log("SEARCH DATA QUALITY");
  console.log("=".repeat(70));
  console.log(`Total tickers: ${rows.length}`);
  console.log(`Duplicate tickers: ${duplicates.length}`);
  for (const [t, c] of duplicates) console.log(`  ${t}: ${c} rows`);
  console.log(`Missing/empty name: ${missingName.length}`);
  for (const r of missingName) console.log(`  ${r.ticker}`);
  console.log(`Missing/empty issuer: ${missingIssuer.length}`);
  for (const r of missingIssuer) console.log(`  ${r.ticker}`);
  console.log(`Inconsistent ticker casing (not uppercase in DB): ${inconsistentCasing.length}`);
  for (const r of inconsistentCasing) console.log(`  "${r.ticker}"`);
  console.log(`Unrecognized provider_id (providerLabel() would fall back to raw id): ${unknownProvider.length}`);
  for (const r of unknownProvider) console.log(`  ${r.ticker}: "${r.provider_id}"`);

  // --- Route validity: every search-index ticker -> generated route -> live page ---
  console.log(`\nVerifying every ticker resolves to a live page (EN + KO)...`);
  const routeIssues = [];
  for (const [idx, r] of rows.entries()) {
    if ((idx + 1) % 20 === 0) console.log(`  ... ${idx + 1}/${rows.length}`);
    const t = r.ticker.toLowerCase();
    const [enStatus, koStatus] = await Promise.all([
      checkRoute(`${BASE_URL}/${t}`),
      checkRoute(`${BASE_URL}/ko/${t}`),
    ]);
    if (enStatus !== 200) routeIssues.push({ ticker: r.ticker, route: `/${t}`, status: enStatus });
    if (koStatus !== 200) routeIssues.push({ ticker: r.ticker, route: `/ko/${t}`, status: koStatus });
  }

  console.log(`\nRoute issues (search index entry with no valid live page): ${routeIssues.length}`);
  for (const issue of routeIssues) {
    console.log(`  ${issue.ticker} -> ${issue.route}: ${issue.status}`);
  }

  const unresolved =
    duplicates.length + missingName.length + missingIssuer.length + routeIssues.length;
  console.log(
    `\n${unresolved === 0 ? "[OK]" : "[ACTION NEEDED]"} Unresolved search data-quality issues: ${unresolved}`
  );
  console.log("(Inconsistent casing / unrecognized provider are informational — the app already");
  console.log(" normalizes ticker casing via generateStaticParams and providerLabel() falls back");
  console.log(" to the raw id rather than erroring, so neither breaks a search result by itself.)");
  console.log("\nDone.");
}

main();

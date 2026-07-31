#!/usr/bin/env node
// CRADY Official Distribution Center — announcement importer.
//
// Written in Node rather than Python (unlike the rest of the pipeline in
// C:\CRADY) because Python is not executable in this working environment —
// see the CRADY Official Distribution Center report for the full audit.
// Uses the exact same env-var names/convention as scrapers/common.py
// (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) so it can be pointed at the same
// C:\CRADY\.env. Long-term this logic belongs alongside the Python scrapers;
// this is a faithful placeholder until Python is available to port it.
//
// Usage:
//   node --env-file=C:\CRADY\.env scripts/import-distribution-announcement.mjs
//     (dry-run by default — no writes)
//   node --env-file=C:\CRADY\.env scripts/import-distribution-announcement.mjs --apply
//     (writes: creates the announcement row, links matching distributions
//      rows, inserts any missing rows, backfills distribution_rate/
//      sec_yield_30d per ticker from each official page). NEVER overwrites
//      a conflicting existing amount — logs it to scrape_logs and skips.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const APPLY = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required (see scrapers/common.py convention).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ── The verified real announcement (fetched + hand-verified 2026-07-31) ────
const ANNOUNCEMENT = {
  issuer: "YieldMax",
  provider_id: "yieldmax",
  title: "YieldMax® ETFs Announces Weekly Distributions for Group 2 ETFs",
  announcement_date: "2026-07-29",
  ex_date: "2026-07-30",
  record_date: "2026-07-30",
  pay_date: "2026-07-31",
  source_url:
    "https://www.globenewswire.com/news-release/2026/07/29/3335067/0/en/yieldmax-etfs-announces-weekly-distributions-for-group-2-etfs.html",
  source_type: "globenewswire",
  rows: {
    AIYY: 0.1044, AMDY: 0.6309, AMZY: 0.0708, APLY: 0.1415, BABO: 0.1245,
    BRKC: 0.1475, CONY: 0.2942, CRCO: 0.215, CRSH: 0.3584, CVNY: 0.2988,
    DIPS: 0.3059, DRAY: 0.1461, FBY: 0.0881, FIAT: 0.265, GDXY: 0.0961,
    GMEY: 0.2218, GOOY: 0.0862, HIYY: 0.2361, HOOY: 0.3317, INYY: 0.653,
    JPO: 0.1047, MARO: 0.0786, MRNY: 0.2374, MSFO: 0.0772, MSTY: 0.2222,
    NFLY: 0.0445, NVDY: 0.1187, OARK: 0.2123, PLTY: 0.3347, PYPY: 0.5321,
    RBLY: 0.1707, RDYY: 0.2759, SMCY: 0.0714, SNOY: 0.1415, TSLY: 0.2147,
    TSMY: 0.1344, WNTR: 0.4717, XOMO: 0.1218, XYZY: 0.244, YSPC: 0.4264,
    YBIT: 0.1851, YQQQ: 0.0651,
  },
};

// ── slug + hash (mirrors lib/distributions/slug.ts and hash.ts) ────────────
function extractAnnouncementDiscriminator(title) {
  const groupMatch = title.match(/group\s+(\d+)/i);
  if (groupMatch) return `group-${groupMatch[1]}`;
  const targetMatch = title.match(/target\s+(\d+)/i);
  if (targetMatch) return `target-${targetMatch[1]}`;
  const tickerMatches = title.match(/\b[A-Z]{2,5}\b/g);
  if (tickerMatches && tickerMatches.length > 0 && tickerMatches.length <= 6) {
    return tickerMatches.map((t) => t.toLowerCase()).join("-");
  }
  return (
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "announcement"
  );
}
function buildSlug(date, providerId, title) {
  return `${date}-${providerId}-${extractAnnouncementDiscriminator(title)}`;
}
function computeHash({ title, announcementDate, rows }) {
  const sorted = Object.keys(rows).sort().map((t) => `${t}:${rows[t]}`).join("|");
  return createHash("sha256").update(`${title}\n${announcementDate}\n${sorted}`).digest("hex");
}

// ── fund-stats parser (mirrors lib/distributions/parseFundStats.ts) ────────
function parseFundStats(html) {
  const pairRe =
    /<div class="elementor-heading-title elementor-size-default">([^<]+)<\/div>[\s\S]{0,500}?<h2 class="elementor-heading-title elementor-size-default">([^<]+)<\/h2>/g;
  let m;
  let distributionRate = null;
  let secYield30d = null;
  while ((m = pairRe.exec(html)) !== null) {
    const value = m[1].trim();
    const label = m[2].trim().toLowerCase().replace(/\*/g, "").replace(/[\s-]+/g, " ").trim();
    const pctMatch = value.replace(/%/g, "").match(/-?\d+(?:\.\d+)?/);
    const pct = pctMatch ? Number(pctMatch[0]) : null;
    const plausible = pct != null && pct >= 0 && pct < 500;
    if (label.startsWith("distribution rate") && distributionRate === null && plausible) distributionRate = pct;
    else if (label.startsWith("30 day sec yield") && secYield30d === null && plausible) secYield30d = pct;
  }
  return { distributionRate, secYield30d };
}

async function fetchFundStats(ticker) {
  const url = `https://yieldmaxetfs.com/our-etfs/${ticker.toLowerCase()}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
    });
    if (!res.ok) return { distributionRate: null, secYield30d: null };
    const html = await res.text();
    return parseFundStats(html);
  } catch {
    return { distributionRate: null, secYield30d: null };
  }
}

async function logToScrapeLogs(status, message, rowsInserted = 0, rowsUpdated = 0) {
  try {
    await supabase.from("scrape_logs").insert({
      source: "distribution_announcement_import",
      status,
      message,
      rows_inserted: rowsInserted,
      rows_updated: rowsUpdated,
    });
  } catch (e) {
    console.warn("[WARN] scrape_logs insert failed:", e.message);
  }
}

async function main() {
  const tickers = Object.keys(ANNOUNCEMENT.rows);
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — ${ANNOUNCEMENT.title}`);
  console.log(`Tickers: ${tickers.length}`);

  // 1) Classify each ticker against existing distributions rows.
  const { data: existingRows, error: fetchErr } = await supabase
    .from("distributions")
    .select("ticker, amount, announcement_id")
    .eq("provider_id", ANNOUNCEMENT.provider_id)
    .eq("ex_date", ANNOUNCEMENT.ex_date)
    .in("ticker", tickers);
  if (fetchErr) throw new Error(fetchErr.message);
  const existingByTicker = new Map(existingRows.map((r) => [r.ticker, r]));

  const toLink = [];
  const toInsert = [];
  const conflicts = [];
  for (const ticker of tickers) {
    const official = ANNOUNCEMENT.rows[ticker];
    const existing = existingByTicker.get(ticker);
    if (!existing) {
      toInsert.push({ ticker, official });
    } else if (Math.abs(Number(existing.amount) - official) < 0.00005) {
      toLink.push({ ticker, existing });
    } else {
      conflicts.push({ ticker, official, existing: Number(existing.amount) });
    }
  }

  console.log(`\nPlan: link=${toLink.length} insert=${toInsert.length} conflicts=${conflicts.length}`);
  if (conflicts.length) {
    console.log("CONFLICTS (will NOT overwrite, will log for review):");
    for (const c of conflicts) console.log(`  ${c.ticker}: official=$${c.official} existing=$${c.existing}`);
  }

  if (!APPLY) {
    console.log("\nDry run only — no writes performed. Re-run with --apply to write.");
    return;
  }

  if (conflicts.length) {
    await logToScrapeLogs(
      "conflict",
      `Announcement "${ANNOUNCEMENT.title}" (${ANNOUNCEMENT.source_url}) had ${conflicts.length} conflicting row(s): ${JSON.stringify(conflicts)}`,
      0,
      0
    );
    console.log(`\n${conflicts.length} conflict(s) logged to scrape_logs for manual review. These rows were NOT modified.`);
  }

  // 2) Create (or reuse) the announcement record — idempotent on source_url.
  const slug = buildSlug(ANNOUNCEMENT.announcement_date, ANNOUNCEMENT.provider_id, ANNOUNCEMENT.title);
  const sourceHash = computeHash({
    title: ANNOUNCEMENT.title,
    announcementDate: ANNOUNCEMENT.announcement_date,
    rows: ANNOUNCEMENT.rows,
  });

  const { data: existingAnnouncement } = await supabase
    .from("distribution_announcements")
    .select("id")
    .eq("source_url", ANNOUNCEMENT.source_url)
    .maybeSingle();

  let announcementId;
  if (existingAnnouncement) {
    announcementId = existingAnnouncement.id;
    console.log(`\nAnnouncement already exists (id=${announcementId}) — reusing (idempotent re-run).`);
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("distribution_announcements")
      .insert({
        issuer: ANNOUNCEMENT.issuer,
        provider_id: ANNOUNCEMENT.provider_id,
        title: ANNOUNCEMENT.title,
        slug,
        announcement_date: ANNOUNCEMENT.announcement_date,
        source_url: ANNOUNCEMENT.source_url,
        source_type: ANNOUNCEMENT.source_type,
        source_hash: sourceHash,
        etf_count: tickers.length,
        status: "published",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    announcementId = inserted.id;
    console.log(`\nCreated distribution_announcements row: id=${announcementId} slug=${slug}`);
  }

  // 3) Backfill distribution_rate / sec_yield_30d per ticker (rate-limited,
  //    matching the existing scrapers' 0.6s-between-requests convention).
  const fundStatsByTicker = new Map();
  const allTickers = [...toLink.map((r) => r.ticker), ...toInsert.map((r) => r.ticker)];
  for (const ticker of allTickers) {
    const stats = await fetchFundStats(ticker);
    fundStatsByTicker.set(ticker, stats);
    console.log(`  fund-stats ${ticker}: rate=${stats.distributionRate ?? "—"}% secYield=${stats.secYield30d ?? "—"}%`);
    await new Promise((r) => setTimeout(r, 600));
  }

  // 4) Link existing matching rows.
  let updated = 0;
  for (const { ticker } of toLink) {
    const stats = fundStatsByTicker.get(ticker) ?? { distributionRate: null, secYield30d: null };
    const { error } = await supabase
      .from("distributions")
      .update({
        announcement_id: announcementId,
        distribution_rate: stats.distributionRate,
        sec_yield_30d: stats.secYield30d,
      })
      .eq("provider_id", ANNOUNCEMENT.provider_id)
      .eq("ticker", ticker)
      .eq("ex_date", ANNOUNCEMENT.ex_date);
    if (error) {
      console.error(`  ! link failed for ${ticker}: ${error.message}`);
    } else {
      updated++;
    }
  }

  // 5) Insert genuinely missing rows.
  let inserted = 0;
  for (const { ticker, official } of toInsert) {
    const stats = fundStatsByTicker.get(ticker) ?? { distributionRate: null, secYield30d: null };
    const { error } = await supabase.from("distributions").upsert(
      {
        provider_id: ANNOUNCEMENT.provider_id,
        ticker,
        declaration_date: null,
        ex_date: ANNOUNCEMENT.ex_date,
        record_date: ANNOUNCEMENT.record_date,
        pay_date: ANNOUNCEMENT.pay_date,
        amount: official,
        source_url: ANNOUNCEMENT.source_url,
        announcement_id: announcementId,
        distribution_rate: stats.distributionRate,
        sec_yield_30d: stats.secYield30d,
      },
      { onConflict: "provider_id,ticker,ex_date" }
    );
    if (error) {
      console.error(`  ! insert failed for ${ticker}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`\n=== APPLY SUMMARY ===`);
  console.log(`Linked (announcement_id + fund stats set): ${updated}`);
  console.log(`Inserted (new rows):                       ${inserted}`);
  console.log(`Conflicts (skipped, logged):                ${conflicts.length}`);

  await logToScrapeLogs(
    conflicts.length ? "partial_success" : "success",
    `Imported "${ANNOUNCEMENT.title}" (${ANNOUNCEMENT.source_url}): linked=${updated} inserted=${inserted} conflicts=${conflicts.length}`,
    inserted,
    updated
  );
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

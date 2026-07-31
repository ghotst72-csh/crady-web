// DRY RUN ONLY — read-only via the public anon key. Compares the real
// official GlobeNewswire announcement (fetched and transcribed verbatim on
// 2026-07-31, source URL below) against what's currently in `distributions`.
// No writes happen here — this is step 6/7 of the approved safety checklist:
// "run the importer in dry-run mode first, compare row-by-row, show expected
// inserts/updates before the first production write."
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

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
  // Verbatim from the fetched press release — ticker -> distribution per share (USD).
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

const tickers = Object.keys(ANNOUNCEMENT.rows);
console.log(`Announcement: ${ANNOUNCEMENT.title}`);
console.log(`Source: ${ANNOUNCEMENT.source_url}`);
console.log(`Tickers in announcement: ${tickers.length}\n`);

const { data, error } = await supabase
  .from("distributions")
  .select("ticker, provider_id, ex_date, pay_date, amount, roc_rate, source_url")
  .eq("provider_id", ANNOUNCEMENT.provider_id)
  .eq("ex_date", ANNOUNCEMENT.ex_date)
  .in("ticker", tickers);

if (error) throw new Error(error.message);

const existingByTicker = new Map(data.map((r) => [r.ticker, r]));

let matches = 0, conflicts = 0, missing = 0;
const conflictRows = [];
const missingRows = [];

for (const ticker of tickers) {
  const officialAmount = ANNOUNCEMENT.rows[ticker];
  const existing = existingByTicker.get(ticker);
  if (!existing) {
    missing++;
    missingRows.push(ticker);
    console.log(`MISSING   ${ticker.padEnd(6)} official=$${officialAmount.toFixed(4)}  (no existing row for ex_date=${ANNOUNCEMENT.ex_date} — would INSERT)`);
    continue;
  }
  const existingAmount = Number(existing.amount);
  if (Math.abs(existingAmount - officialAmount) < 0.00005) {
    matches++;
    console.log(`MATCH     ${ticker.padEnd(6)} official=$${officialAmount.toFixed(4)}  existing=$${existingAmount.toFixed(4)}  -> link to announcement only, no amount change`);
  } else {
    conflicts++;
    conflictRows.push({ ticker, officialAmount, existingAmount });
    console.log(`CONFLICT  ${ticker.padEnd(6)} official=$${officialAmount.toFixed(4)}  existing=$${existingAmount.toFixed(4)}  -> WOULD NOT OVERWRITE, would log for review`);
  }
}

console.log(`\n=== DRY RUN SUMMARY ===`);
console.log(`Matches (link only, no data change): ${matches}`);
console.log(`Missing (would insert new row):      ${missing}`);
console.log(`Conflicts (would skip + log):         ${conflicts}`);
console.log(`Total tickers in announcement:        ${tickers.length}`);
console.log(`Row count check: ${matches + missing + conflicts === tickers.length ? "OK" : "MISMATCH — investigate"}`);

if (conflictRows.length) {
  console.log("\nConflict detail:");
  console.table(conflictRows);
}
if (missingRows.length) {
  console.log("\nMissing tickers:", missingRows.join(", "));
}

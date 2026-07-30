// Checks how many of Magazine 3.0's target search intents each ticker's
// flagship page (next-dividend-prediction — the page item 12 designates as
// "the most complete reference page" for a ticker) actually covers on-page,
// in EN and KO. Each intent is a list of acceptable substrings (Korean word
// order varies — "배당 예상" vs "예상 배당금" are the same intent, so an
// intent counts as covered if ANY of its variants appears) rather than one
// exact phrase, so the audit reflects real coverage instead of penalizing
// legitimate phrasing differences.
//
// Reports, per ticker and in aggregate: intents covered / missing, body
// word count, section count (a proxy for "section diversity" — how many
// distinct content blocks the page has), and a crude keyword-stuffing
// check (any single distinctive word appearing implausibly often).
//
// Usage: start `npm run start` first (or `npm run dev`), then:
//   node scripts/audit-search-intent.mjs [baseUrl]

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

// {t} is replaced with the uppercase ticker. Each intent is "covered" if
// ANY of its variant substrings (checked case-insensitively) appears in the
// page's visible text. No "record date" intent — CRADY doesn't track that
// field, so nothing claims to answer it (see lib/magazine/sections.tsx
// dividendTimelineSection). The first 15 are the exact Magazine 4.0 target
// list; the rest carry over from 3.0's broader coverage tracking.
const EN_INTENTS = [
  { label: "TSLY dividend", variants: ["{t} dividend"] },
  { label: "TSLY next dividend", variants: ["next {t} dividend", "{t}'s next dividend", "next dividend"] },
  { label: "TSLY dividend prediction", variants: ["dividend prediction"] },
  { label: "TSLY dividend forecast", variants: ["dividend forecast"] },
  { label: "TSLY ex dividend date", variants: ["ex-dividend date", "ex dividend date"] },
  { label: "TSLY payment date", variants: ["payment date"] },
  { label: "TSLY dividend calendar", variants: ["dividend calendar"] },
  { label: "TSLY monthly dividend", variants: ["monthly dividend"] },
  { label: "TSLY dividend history", variants: ["dividend history"] },
  { label: "TSLY expected dividend", variants: ["expected dividend", "expected {t} dividend"] },
  // Month+year is date-relative (the page freshens automatically rather
  // than minting a URL per month — see describeTiming/monthYearLabel in
  // lib/magazine/timing.ts), so this checks the PATTERN via regex against
  // the current month/year rather than a hardcoded "August 2026".
  { label: "TSLY dividend {current Month Year}", regex: true },
  { label: "TSLY dividend this month", variants: ["later this month", "this month"] },
  { label: "TSLY dividend next month", variants: ["next month"] },
  { label: "TSLY dividend this week", variants: ["this week"] },
  { label: "TSLY dividend next week", variants: ["next week"] },
  { label: "ex-dividend (general)", variants: ["ex-dividend", "ex dividend"] },
  { label: "distribution", variants: ["distribution"] },
  { label: "dividend yield", variants: ["dividend yield", "annualized yield"] },
  { label: "dividend safety", variants: ["dividend safe", "dividend safety", "is risky"] },
  { label: "weekly dividend", variants: ["weekly dividend"] },
  { label: "announcement/declared", variants: ["announce", "declared"] },
  { label: "trend (increase/decrease)", variants: ["increase", "decrease", "trend"] },
  { label: "confidence", variants: ["confidence"] },
  { label: "comparison", variants: [" vs ", "compare"] },
];

const KO_INTENTS = [
  { label: "배당", variants: ["{t} 배당"] },
  { label: "배당금", variants: ["배당금"] },
  { label: "다음 배당", variants: ["다음 배당"] },
  { label: "배당일", variants: ["배당일"] },
  { label: "배당락일", variants: ["배당락일"] },
  { label: "지급일", variants: ["지급일"] },
  { label: "배당 예상", variants: ["배당 예상", "예상 배당"] },
  { label: "월배당/주배당", variants: ["월배당", "주배당", "월간", "주간"] },
  { label: "배당 수익률/배당률", variants: ["배당 수익률", "배당률"] },
  { label: "배당 캘린더", variants: ["배당 캘린더"] },
  { label: "이번주/다음주 배당", variants: ["이번 주", "다음 주"] },
  { label: "선언(발표)", variants: ["선언", "발표"] },
];

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ");
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

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "dividend" and ANY "{Month} {Year}" pattern appearing within ~40
 * characters of each other — close enough to read as one natural
 * phrase/clause ("CRADY's TSLY dividend forecast for August 2026 is...")
 * without requiring an exact contiguous substring, which real prose rarely
 * is. NOT pinned to the current calendar month: a ticker's next predicted
 * payment can fall in a later month than "now" (e.g. a monthly payer whose
 * next date is 5 weeks out), and the page correctly shows THAT payment's
 * month — checking only against today's month penalized every ticker
 * whose forecast wasn't due this exact month, which was a bug in the
 * check, not the content. */
function hasMonthYearDividendMention(bodyText) {
  const monthYearRe = new RegExp(`\\b(${MONTH_NAMES.join("|")}) (20\\d{2})\\b`, "g");
  let m;
  while ((m = monthYearRe.exec(bodyText))) {
    const windowStart = Math.max(0, m.index - 40);
    const window = bodyText.slice(windowStart, m.index + 20);
    if (window.includes("dividend")) return true;
  }
  return false;
}

/** FAQ answers that point to "above"/"below" WITHOUT having said much of
 * anything first aren't self-contained — they read as incomplete out of
 * context, which is exactly how Featured Snippet / AI Overview extraction
 * shows them. Catches regressions of the bug fixed in Magazine 4.0 (see
 * lib/magazine/faq.ts — the "this week or next week" question used to
 * answer only "see the highlight box above", no data of its own).
 *
 * A digit-presence check was tried first and produced false positives:
 * "TSMY, ULTY, WNTR are other YieldMax funds tracked by CRADY. See the
 * comparison ... below" names three real tickers — genuinely substantive
 * — but has no digits. A minimum-length check on the text before the
 * pointer is the more reliable signal: it's language- and
 * punctuation-agnostic (works whether the transition is ". ", " — ", or
 * nothing at all) and only flags answers that are ACTUALLY thin before
 * the pointer, not ones that happen to lack numerals. */
function extractFaqSelfContainment(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const issues = [];
  const MIN_SUBSTANTIVE_CHARS = 25;
  for (const [, json] of scripts) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      continue;
    }
    if (parsed["@type"] !== "FAQPage") continue;
    for (const entry of parsed.mainEntity ?? []) {
      const answer = (entry.acceptedAnswer?.text ?? "").toLowerCase();
      const pointerMatch = answer.match(/above|below|위 |아래/);
      if (!pointerMatch) continue;
      const before = answer.slice(0, pointerMatch.index).trim();
      if (before.length < MIN_SUBSTANTIVE_CHARS) issues.push(entry.name);
    }
  }
  return issues;
}

async function auditTicker(ticker) {
  const url = `${BASE_URL}/magazine/${ticker.toLowerCase()}-next-dividend-prediction`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (res.status !== 200) return null;

  const html = await res.text();
  const bodyHtml = extractBalancedDivContent(html, "magazine-article-body");
  const bodyText = normalize(stripTags(bodyHtml));
  const sectionCount = (bodyHtml.match(/<h2[^>]*>/g) ?? []).length + 1; // +1 for the headingless featured snippet
  const faqIssues = extractFaqSelfContainment(html);

  function checkIntents(intents) {
    const covered = [];
    const missing = [];
    for (const intent of intents) {
      const hit = intent.regex
        ? hasMonthYearDividendMention(bodyText)
        : intent.variants.some((v) => bodyText.includes(normalize(v.replace("{t}", ticker))));
      (hit ? covered : missing).push(intent.label);
    }
    return { covered, missing };
  }

  const en = checkIntents(EN_INTENTS);
  const ko = checkIntents(KO_INTENTS);

  // Crude stuffing check: does any distinctive word appear implausibly
  // often relative to body length? First pass flagged "dividend"x50 and
  // "2026"x48 on literally every page — a page with 12 sections titled
  // "{ticker} Dividend X" (Timeline, Trend, Summary, History...) plus a
  // distribution table full of 2026 dates is naturally dividend- and
  // date-dense; that's on-topic structure, not manipulation (Google's
  // spam policy targets repetition with no organic reason to appear, not
  // a dividend page saying "dividend" often). Numeric tokens (years,
  // prices) and a small set of structurally-repeating topic words are
  // excluded; the ratio threshold is raised to only catch genuinely
  // abnormal repetition.
  const STUFFING_EXEMPT = new Set(["dividend", "payment", "share", "next", ticker.toLowerCase()]);
  const words = bodyText
    .replace(/[^a-z0-9가-힣%$.\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !/^[\d.$]+$/.test(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const stuffed = [...freq.entries()]
    .filter(([w, c]) => c / words.length > 0.05 && c >= 15 && !STUFFING_EXEMPT.has(w))
    .sort((a, b) => b[1] - a[1]);

  return {
    ticker,
    wordCount: words.length,
    sectionCount,
    enCovered: en.covered.length,
    enMissing: en.missing,
    koCovered: ko.covered.length,
    koMissing: ko.missing,
    stuffed,
    faqIssues,
  };
}

async function main() {
  console.log(`Fetching ticker list from ${BASE_URL}/sitemap.xml ...`);
  const tickers = await fetchTickers();
  console.log(`Found ${tickers.length} tickers.\n`);

  const results = [];
  for (const [idx, ticker] of tickers.entries()) {
    if ((idx + 1) % 10 === 0 || idx === 0) console.log(`  ... ${idx + 1}/${tickers.length} (${ticker})`);
    const r = await auditTicker(ticker);
    if (r) results.push(r);
  }

  const avgEn = results.reduce((s, r) => s + r.enCovered, 0) / results.length;
  const avgKo = results.reduce((s, r) => s + r.koCovered, 0) / results.length;
  const avgWords = results.reduce((s, r) => s + r.wordCount, 0) / results.length;
  const avgSections = results.reduce((s, r) => s + r.sectionCount, 0) / results.length;
  const stuffedPages = results.filter((r) => r.stuffed.length > 0);

  const missingTally = new Map();
  for (const r of results) {
    for (const label of [...r.enMissing, ...r.koMissing]) {
      missingTally.set(label, (missingTally.get(label) ?? 0) + 1);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("SEARCH INTENT COVERAGE — next-dividend-prediction (flagship page)");
  console.log("=".repeat(70));
  console.log(`Tickers audited: ${results.length}`);
  console.log(`EN intents tracked: ${EN_INTENTS.length} | avg covered: ${avgEn.toFixed(1)} (${((avgEn / EN_INTENTS.length) * 100).toFixed(0)}%)`);
  console.log(`KO intents tracked: ${KO_INTENTS.length} | avg covered: ${avgKo.toFixed(1)} (${((avgKo / KO_INTENTS.length) * 100).toFixed(0)}%)`);
  console.log(`Average body length: ${avgWords.toFixed(0)} words`);
  console.log(`Average section count: ${avgSections.toFixed(1)}`);
  console.log(`Pages with possible keyword stuffing: ${stuffedPages.length}`);
  for (const r of stuffedPages) {
    console.log(`  ${r.ticker}: ${r.stuffed.map(([w, c]) => `"${w}"x${c}`).join(", ")}`);
  }

  console.log(`\nMost commonly missing intents across all tickers:`);
  const sortedMissing = [...missingTally.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedMissing.length === 0) {
    console.log("  (none — every tracked intent found on every ticker)");
  }
  for (const [label, count] of sortedMissing.slice(0, 15)) {
    console.log(`  ${label}: missing on ${count}/${results.length} tickers`);
  }

  const worst = results
    .map((r) => ({ ticker: r.ticker, total: r.enCovered + r.koCovered, max: EN_INTENTS.length + KO_INTENTS.length }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 10);
  console.log(`\nLowest-coverage tickers:`);
  for (const w of worst) {
    console.log(`  ${w.ticker}: ${w.total}/${w.max} intents covered`);
  }

  const withFaqIssues = results.filter((r) => r.faqIssues.length > 0);
  console.log(
    `\nFAQ answers that lean on "see above/below" instead of stating the fact ` +
      `(hurts Featured Snippet / AI Overview extraction): ${withFaqIssues.length} ticker(s)`
  );
  for (const r of withFaqIssues) {
    console.log(`  ${r.ticker}: ${r.faqIssues.join(" | ")}`);
  }

  console.log("\nDone.");
}

main();

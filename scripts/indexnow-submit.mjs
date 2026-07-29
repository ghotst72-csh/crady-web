// Notifies IndexNow (Bing, Yandex, Seznam, Naver — not Google, which doesn't
// support the protocol) about every URL in the sitemap right after a
// production deploy finishes, so those engines can crawl new/changed pages
// within minutes instead of waiting for their normal crawl schedule.
//
// Runs as `postbuild` (see package.json) but only does anything when
// VERCEL_ENV === "production" — local builds and preview deploys skip it
// entirely so IndexNow is never pinged with non-canonical URLs.
//
// Plain Node script (no TS import) — INDEXNOW_KEY here must stay in sync
// with lib/constants.ts and the key file served by middleware.ts.

const INDEXNOW_KEY = "13fec5e8b5bacc0cb027a0b1e0b8765c";
const HOST = "crady.net";
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[indexnow] skipping — not a production build");
    return;
  }

  let xml;
  try {
    const res = await fetch(SITEMAP_URL);
    if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
    xml = await res.text();
  } catch (err) {
    console.warn("[indexnow] could not fetch sitemap, skipping:", err.message);
    return;
  }

  const urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) {
    console.warn("[indexnow] sitemap had no URLs, skipping");
    return;
  }

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    console.log(
      `[indexnow] submitted ${urlList.length} URLs — status ${res.status}`
    );
  } catch (err) {
    console.warn("[indexnow] submission failed:", err.message);
  }
}

main();

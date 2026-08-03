import { getSitewideActivityHighlights } from "@/lib/activity/data";
import { SitewideActivityWidget } from "./SitewideActivityWidget";

/** Home/Ranking's small Activity entry point — its own fetch, own
 * try/catch-to-null safety (same convention as every other Activity call
 * site), so a query error here can never take down the Home/Ranking page
 * content around it. Deliberately not folded into the page's own
 * Promise.all for the same isolation reason. */
export async function SitewideActivitySection({ lang = "en" }: { lang?: "en" | "ko" }) {
  try {
    return await renderSitewideActivitySection(lang);
  } catch {
    return null;
  }
}

async function renderSitewideActivitySection(lang: "en" | "ko") {
  const highlights = await getSitewideActivityHighlights(lang, 5);
  return <SitewideActivityWidget highlights={highlights} lang={lang} />;
}

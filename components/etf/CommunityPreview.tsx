import { getActivityCounts, getTopLevelItems } from "@/lib/activity/data";

const T = {
  heading: { en: "Community", ko: "커뮤니티" },
  discussions: { en: "discussions", ko: "개 토론" },
  empty: { en: "No discussion yet — be the first.", ko: "아직 토론이 없습니다 — 첫 의견을 남겨보세요." },
  join: { en: (t: string) => `Join ${t} Discussion →`, ko: (t: string) => `${t} 토론 참여하기 →` },
} as const;

/** CRADY Phase 3 — Summary tab's small community teaser (spec §3.6): a
 * count and the latest couple of items, never the full feed. Its own
 * lightweight fetch (same try/catch-to-null safety and independent-
 * Suspense-boundary convention already used by ActivitySection/
 * InvestorDiscussionSection) — never blocks the rest of Summary. The
 * "Join Discussion" link uses a data-etf-tab-link attribute rather than
 * routing, so a plain server-rendered link can switch the client-side
 * workspace tab without becoming a client component itself. */
export async function CommunityPreview({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  try {
    return await renderCommunityPreview(ticker, lang);
  } catch {
    return null;
  }
}

async function renderCommunityPreview(ticker: string, lang: "en" | "ko") {
  const [counts, topLevelItems] = await Promise.all([getActivityCounts(ticker), getTopLevelItems(ticker, 2)]);
  const total = counts.questionCount + counts.totalReplies;

  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold">{T.heading[lang]}</h3>
        {total > 0 && (
          <span className="text-xs text-[var(--gray-500)]">
            {total} {T.discussions[lang]}
          </span>
        )}
      </div>

      {topLevelItems.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {topLevelItems.map((item) => (
            <li key={item.id} className="text-sm text-[var(--gray-700)] line-clamp-1">
              {item.title ?? item.body}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-sm text-[var(--gray-400)]">{T.empty[lang]}</p>
      )}

      <button
        type="button"
        data-etf-tab-link="community"
        className="mt-3 text-xs font-semibold text-[#92400e] hover:underline"
      >
        {T.join[lang](ticker)}
      </button>
    </div>
  );
}

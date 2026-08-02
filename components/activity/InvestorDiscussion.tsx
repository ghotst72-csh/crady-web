import { Badge } from "@/components/ui/Badge";
import { LazyMount } from "./LazyMount";
import { PostComposer } from "./InteractiveIslands/PostComposer";
import { CommentComposer } from "./InteractiveIslands/CommentComposer";
import { CommentActionsBar } from "./InteractiveIslands/CommentActionsBar";
import type { ActivityItem } from "@/lib/activity/types";

const T = {
  heading: { en: "Investor Discussion", ko: "투자자 토론" },
  question: { en: "Q", ko: "질문" },
  empty: {
    en: "No questions or discussion yet — be the first to post about this ETF.",
    ko: "아직 질문이나 토론이 없습니다 — 이 ETF에 대해 처음으로 게시해보세요.",
  },
  moreReplies: { en: "more replies", ko: "개 답글 더보기" },
} as const;

const EXPERTISE_LABEL: Record<string, { en: string; ko: string }> = {
  dividend_expert: { en: "Dividend Expert", ko: "배당 전문가" },
  covered_call_expert: { en: "Covered Call Expert", ko: "커버드콜 전문가" },
  etf_analyst: { en: "ETF Analyst", ko: "ETF 애널리스트" },
  long_term_investor: { en: "Long-term Investor", ko: "장기 투자자" },
  top_contributor: { en: "Top Contributor", ko: "우수 기여자" },
};

function formatDate(iso: string, lang: "en" | "ko"): string {
  return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

/** The one board — questions and discussion items share a single
 * reverse-chronological feed, each with its replies inline (no separate
 * "Hot Questions" list, no separate global forum). Every item/reply body is
 * server-rendered; only the composer and action controls are client
 * islands. Top-level items and their replies are the same underlying
 * Activity item shape (source: "investor"), just distinguished by
 * parentId. */
export function InvestorDiscussion({
  ticker,
  lang = "en",
  topLevelItems,
  repliesByParent,
}: {
  ticker: string;
  lang?: "en" | "ko";
  topLevelItems: ActivityItem[];
  repliesByParent: Map<string, ActivityItem[]>;
}) {
  return (
    <section id="investor-discussion" className="mt-8 scroll-mt-4">
      <h2 className="text-lg font-bold mb-3">{T.heading[lang]}</h2>

      <LazyMount minHeight={140} className="mb-4">
        <PostComposer ticker={ticker} lang={lang} />
      </LazyMount>

      {topLevelItems.length === 0 ? (
        <p className="text-sm text-[var(--gray-400)] border border-[var(--gray-200)] rounded-xl px-4 py-6 text-center">
          {T.empty[lang]}
        </p>
      ) : (
        <div className="space-y-4">
          {topLevelItems.map((item) => {
            const replies = repliesByParent.get(item.id) ?? [];
            const hasMore = item.replyCount > replies.length;
            return (
              <article
                key={item.id}
                id={`activity-item-${item.id}`}
                className="border border-[var(--gray-200)] rounded-xl p-4 scroll-mt-20"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                  {item.type === "question" && <Badge variant="accent">{T.question[lang]}</Badge>}
                  <span className="font-semibold text-[var(--gray-700)]">{item.author?.displayName}</span>
                  {item.author?.expertiseBadge && EXPERTISE_LABEL[item.author.expertiseBadge] && (
                    <Badge variant="accent-outline">{EXPERTISE_LABEL[item.author.expertiseBadge][lang]}</Badge>
                  )}
                  <span>·</span>
                  <span>{formatDate(item.createdAt, lang)}</span>
                </div>

                {item.title && <h3 className="mt-1.5 font-semibold text-[15px]">{item.title}</h3>}
                <p className="mt-1 text-sm text-[var(--gray-700)] leading-relaxed whitespace-pre-line">
                  {item.body}
                </p>

                <LazyMount minHeight={20}>
                  <CommentActionsBar
                    targetId={item.id}
                    authorUserId={item.userId ?? ""}
                    body={item.body}
                    lang={lang}
                  />
                </LazyMount>

                {replies.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-[var(--gray-100)] space-y-3">
                    {replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                          <span className="font-semibold text-[var(--gray-700)]">
                            {reply.author?.displayName}
                          </span>
                          {reply.author?.expertiseBadge && EXPERTISE_LABEL[reply.author.expertiseBadge] && (
                            <Badge variant="accent-outline">
                              {EXPERTISE_LABEL[reply.author.expertiseBadge][lang]}
                            </Badge>
                          )}
                          <span>·</span>
                          <span>{formatDate(reply.createdAt, lang)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-[var(--gray-700)] leading-relaxed whitespace-pre-line">
                          {reply.body}
                        </p>
                        <LazyMount minHeight={20}>
                          <CommentActionsBar
                            targetId={reply.id}
                            authorUserId={reply.userId ?? ""}
                            body={reply.body}
                            lang={lang}
                          />
                        </LazyMount>
                      </div>
                    ))}
                    {hasMore && (
                      <p className="text-xs text-[var(--gray-400)]">
                        {item.replyCount - replies.length} {T.moreReplies[lang]}
                      </p>
                    )}
                  </div>
                )}

                <LazyMount minHeight={24} className="mt-2">
                  <CommentComposer ticker={ticker} parentId={item.id} lang={lang} />
                </LazyMount>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

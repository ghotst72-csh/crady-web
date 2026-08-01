import type { FaqItem } from "@/lib/magazine/types";

const T = {
  faqHeading: { en: "Frequently Asked Questions", ko: "자주 묻는 질문" },
} as const;

/** The profile page's own 50-70 word answer to "what is this ETF" — self-
 * contained and factual, the same extraction-friendly style as the
 * Magazine system's featuredSnippetSection, given an id for the page's
 * Speakable structured data to point at. */
export function ProfileSnippet({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p
      id="profile-snippet"
      className="mt-6 text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4"
    >
      {text}
    </p>
  );
}

export function ProfileFaq({ items, lang = "en" }: { items: FaqItem[]; lang?: "en" | "ko" }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-3">{T.faqHeading[lang]}</h2>
      <div className="border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)] px-4">
        {items.map((item) => (
          <div key={item.question} className="py-4">
            <div className="font-semibold text-sm">{item.question}</div>
            <p className="mt-1.5 text-sm text-[var(--gray-600)]">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

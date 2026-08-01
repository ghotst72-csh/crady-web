const T = {
  comingSoon: { en: "Coming Soon", ko: "출시 예정" },
  label: { en: "App Store", ko: "App Store" },
} as const;

/** A disabled-looking "coming soon" pill next to GooglePlayButton wherever
 * the app is promoted — CRADY is Android-only today, but every app-promo
 * touchpoint should say so rather than implying iOS parity by omission. */
export function AppStoreBadge({ className = "", lang = "en" }: { className?: string; lang?: "en" | "ko" }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 px-5 py-3 border border-[var(--gray-200)] rounded-xl text-sm font-semibold text-[var(--gray-400)] cursor-default ${className}`}
      aria-disabled="true"
    >
      <AppleGlyph />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal text-[var(--gray-400)]">{T.comingSoon[lang]}</span>
        <span>{T.label[lang]}</span>
      </span>
    </span>
  );
}

function AppleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.365 1.43c0 1.14-.463 2.098-1.39 2.876-.925.777-1.99 1.223-3.194 1.14-.05-1.11.44-2.09 1.37-2.87.93-.78 2.02-1.24 3.214-1.146zM20.5 17.19c-.34.79-.53 1.15-.99 1.85-.65.99-1.57 2.23-2.71 2.24-1.02.01-1.28-.67-2.66-.66-1.38.01-1.67.67-2.69.66-1.14-.01-2.01-1.13-2.66-2.12-1.82-2.78-2.02-6.04-.89-7.78.8-1.24 2.06-1.96 3.25-1.96 1.21 0 1.97.66 2.97.66.97 0 1.56-.66 2.97-.66 1.05 0 2.16.57 2.96 1.56-2.6 1.42-2.18 5.13.44 6.21z"
        fill="currentColor"
      />
    </svg>
  );
}

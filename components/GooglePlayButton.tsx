import { GOOGLE_PLAY_URL } from "@/lib/constants";

export function GooglePlayButton({
  className = "",
  label = "Google Play에서 다운로드",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors ${className}`}
    >
      <PlayGlyph />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal text-[var(--gray-300)]">
          지금 다운로드
        </span>
        <span>{label.includes("다운로드") ? "Google Play" : label}</span>
      </span>
    </a>
  );
}

function PlayGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 3.5v17a1 1 0 0 0 1.53.85l14-8.5a1 1 0 0 0 0-1.7l-14-8.5A1 1 0 0 0 4 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

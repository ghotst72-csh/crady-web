/** CRADY brand mark — CRADY Homepage Final Redesign (2026-08-12). A
 * geometric hexagonal "C": a hexagonal ring built from 4 trapezoid facets
 * (top, upper-left, lower-left, bottom), open on the right where a 5th
 * facet would sit — the gap reads as the "C". Facets step from light to
 * dark blue (top-lit look) rather than a smooth gradient, matching the
 * approved logo system's "faceted" description more literally than a
 * `<linearGradient>` would.
 *
 * Single source of truth for the mark — replaces the plain-text
 * `CRA`+amber-`DY` wordmark previously duplicated in Header.tsx, both root
 * layouts' footers, and MobileDrawer.tsx. */

const TONE_FACETS: Record<"on-light" | "on-dark" | "mono", [string, string, string, string]> = {
  "on-light": ["#93C5FD", "#3B82F6", "#2563EB", "#1D4ED8"],
  "on-dark": ["#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA"],
  mono: ["#0B1220", "#0B1220", "#0B1220", "#0B1220"],
};

const TONE_WORDMARK: Record<"on-light" | "on-dark" | "mono", string> = {
  "on-light": "#0B1220",
  "on-dark": "#ffffff",
  mono: "#0B1220",
};

const SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 22, md: 28, lg: 40 };
const SIZE_TEXT: Record<"sm" | "md" | "lg", string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

function HexC({ px, facets }: { px: number; facets: [string, string, string, string] }) {
  // Outer hexagon (R=46) and inner hexagon (R=24), both centered at (50,50),
  // vertices at 0/60/120/180/240/300deg. Facets connect outer edge -> inner
  // edge going O1->O2->O3->O4->O5 (the left 4/6 of the ring); the edge
  // O5->O0->O1 (rightmost point) is deliberately never drawn, leaving the
  // "C" opening facing right, toward the wordmark.
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <polygon points="73,10.16 27,10.16 38,29.2 62,29.2" fill={facets[0]} />
      <polygon points="27,10.16 4,50 26,50 38,29.2" fill={facets[1]} />
      <polygon points="4,50 27,89.84 38,70.8 26,50" fill={facets[2]} />
      <polygon points="27,89.84 73,89.84 62,70.8 38,70.8" fill={facets[3]} />
    </svg>
  );
}

export function Logo({
  variant = "horizontal",
  size = "md",
  tone = "on-light",
  showTagline = false,
  className = "",
}: {
  variant?: "horizontal" | "stacked" | "symbol";
  size?: "sm" | "md" | "lg";
  tone?: "on-light" | "on-dark" | "mono";
  showTagline?: boolean;
  className?: string;
}) {
  const px = SIZE_PX[size];
  const facets = TONE_FACETS[tone];
  const wordmarkColor = TONE_WORDMARK[tone];

  if (variant === "symbol") {
    return (
      <span className={className}>
        <HexC px={px} facets={facets} />
      </span>
    );
  }

  const wordmark = (
    <span className={`font-black tracking-tight ${SIZE_TEXT[size]}`} style={{ color: wordmarkColor }}>
      CRADY
    </span>
  );

  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
        <HexC px={px} facets={facets} />
        {wordmark}
        {showTagline && (
          <span className="text-xs font-medium" style={{ color: tone === "on-dark" ? "#93C5FD" : "#64748B" }}>
            High-Yield ETF Intelligence
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <HexC px={px} facets={facets} />
      <span className="inline-flex flex-col leading-tight">
        {wordmark}
        {showTagline && (
          <span
            className="text-[11px] font-medium leading-tight"
            style={{ color: tone === "on-dark" ? "#93C5FD" : "#64748B" }}
          >
            High-Yield ETF Intelligence
          </span>
        )}
      </span>
    </span>
  );
}

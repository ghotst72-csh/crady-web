type PageShellWidth = "max-w-2xl" | "max-w-3xl" | "max-w-4xl" | "max-w-5xl" | "max-w-6xl";

/** The single top-level content-canvas wrapper for a first-class app page
 * (everything under `<main>` that isn't the sidebar) — introduced by the
 * site-wide page-width audit that found ~15 pages each hand-typing their
 * own `mx-auto max-w-Nxl px-4 sm:px-6 py-*` with a different N, so the app
 * visually jumped between narrow-article and wide-dashboard widths when
 * navigating. `max-w-6xl` (1152px, matching /next-dividend) is the
 * default "app canvas" — pass a narrower `width` only for pages that are
 * genuinely one long-form reading column top to bottom (a Magazine
 * article/guide), not for a dashboard page that merely contains some
 * prose (wrap that prose in its own inner `max-w-2xl`/`max-w-3xl` div
 * instead, keeping this shell at the default). Never changes sidebar
 * width — this only wraps the content column inside `<main>`. */
export function PageShell({
  children,
  width = "max-w-6xl",
  paddingY = "py-10",
  className = "",
}: {
  children: React.ReactNode;
  width?: PageShellWidth;
  paddingY?: string;
  className?: string;
}) {
  return <div className={`mx-auto ${width} px-4 sm:px-6 ${paddingY} ${className}`.trim()}>{children}</div>;
}

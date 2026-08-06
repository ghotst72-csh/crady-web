/** CRADY UI Polish 1.0 — a single shared ⓘ tooltip, used sparingly next to
 * jargon labels (AI Confidence, CRADY Score, Record Date, …). Pure CSS
 * hover/focus reveal — no JS state, so it works as a server component and
 * never adds a client boundary just for a tooltip. Restrained fade only,
 * respects prefers-reduced-motion. */
export function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip align-middle ml-1">
      <span
        tabIndex={0}
        aria-label={text}
        className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-[var(--gray-300)] text-[9px] leading-none text-[var(--gray-400)] cursor-help select-none focus:outline-none focus:border-[var(--gray-500)] focus:text-[var(--gray-600)]"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] rounded-lg bg-black px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 scale-95 transition-[opacity,transform] duration-150 ease-out group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 motion-reduce:transition-none z-20"
      >
        {text}
      </span>
    </span>
  );
}

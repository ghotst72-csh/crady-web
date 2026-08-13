/** Shared per-slot color identity (up to 5 ETFs) reused across the
 * selector row, results grid, and discovery section so a given ETF reads
 * as the same color everywhere on the page during one comparison. */
export const SLOT_LABELS = ["A", "B", "C", "D", "E"] as const;

// Every class string here is a static literal (never string-templated) so
// Tailwind's JIT scanner can actually find and generate it — a
// dynamically-built class name like `border-${color}-500` would silently
// produce no CSS at all.
export const SLOT_COLORS = [
  { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", solid: "bg-blue-600", focusBorder: "focus:!border-blue-500" },
  { text: "text-green-600", bg: "bg-green-50", border: "border-green-200", solid: "bg-green-600", focusBorder: "focus:!border-green-500" },
  { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", solid: "bg-purple-600", focusBorder: "focus:!border-purple-500" },
  { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", solid: "bg-amber-600", focusBorder: "focus:!border-amber-500" },
  { text: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200", solid: "bg-teal-600", focusBorder: "focus:!border-teal-500" },
] as const;

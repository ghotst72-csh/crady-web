export type BadgeVariant =
  | "neutral"
  | "accent"
  | "accent-outline"
  | "blue"
  | "red"
  | "green"
  | "violet";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--gray-100)] text-[var(--gray-600)]",
  accent: "bg-[var(--crady-accent)]/15 text-[var(--crady-accent)]",
  "accent-outline": "border border-[var(--crady-accent)]/40 text-[var(--crady-accent)]",
  // Restrained, sparingly-used hues — not a new brand palette, just enough
  // differentiation to tell article types apart at a glance (Part 6). Blue
  // and green already existed once each on the site (the ticker hero's
  // "Upcoming Ex-Date" pill, the Risk Analysis "Advantages" heading) —
  // reused here rather than inventing unrelated colors.
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

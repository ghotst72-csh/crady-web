"use client";

import { usePathname } from "next/navigation";
import { getLocaleTargetPath } from "@/lib/i18n/localePath";
import { setStoredLanguagePreference } from "@/lib/i18n/preference";

/** The footer's language link — secondary access alongside the header
 * switcher (Part 2). Needs its own tiny client component because the root
 * layouts are server components and usePathname() is client-only; reuses
 * the same getLocaleTargetPath so "current page preserved" behavior can't
 * drift between the header switcher and this link. */
export function FooterLanguageLink({
  target,
  label,
}: {
  target: "en" | "ko";
  label: string;
}) {
  const pathname = usePathname();

  return (
    <a
      href={getLocaleTargetPath(pathname, target)}
      onClick={() => setStoredLanguagePreference(target)}
      className="hover:text-black underline"
    >
      {label}
    </a>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare ETFs Side by Side — CRADY",
  description:
    "Compare 2 to 5 high-dividend covered-call ETFs over the same real historical period — total return, distributions, yield, CRADY Score, drawdown, and dividend stability.",
  alternates: {
    canonical: "https://crady.net/compare",
    languages: {
      en: "https://crady.net/compare",
      ko: "https://crady.net/ko/compare",
      "x-default": "https://crady.net/compare",
    },
  },
};

export default async function ComparePage() {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Compare", url: "https://crady.net/compare" },
        ]}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--gray-600)] mb-3">
        <Link href="/" className="hover:text-black">Home</Link> <span aria-hidden="true">/</span>{" "}
        <span className="text-[var(--gray-900)]">Compare ETFs</span>
      </nav>

      <CompareWorkspace searchIndex={searchIndex} lang="en" />
    </PageShell>
  );
}

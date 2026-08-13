import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF 비교 — CRADY",
  description: "2~5개의 고배당 커버드콜 ETF를 동일한 실제 기간 동안 비교하세요: 총수익률, 분배금, 배당률, CRADY 점수, 낙폭, 배당 안정성.",
  alternates: {
    canonical: "https://crady.net/ko/compare",
    languages: {
      en: "https://crady.net/compare",
      ko: "https://crady.net/ko/compare",
      "x-default": "https://crady.net/compare",
    },
  },
};

export default async function CompareKoPage() {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "비교", url: "https://crady.net/ko/compare" },
        ]}
      />
      <nav aria-label="이동 경로" className="text-xs text-[var(--gray-600)] mb-3">
        <Link href="/ko" className="hover:text-black">홈</Link> <span aria-hidden="true">/</span>{" "}
        <span className="text-[var(--gray-900)]">ETF 비교</span>
      </nav>

      <CompareWorkspace searchIndex={searchIndex} lang="ko" basePath="/ko" />
    </PageShell>
  );
}

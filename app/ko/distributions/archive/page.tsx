import type { Metadata } from "next";
import Link from "next/link";
import { getAllAnnouncements } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { providerLabel } from "@/lib/providers";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "분배금 발표 아카이브",
  description: "지금까지의 모든 공식 ETF 분배금 발표 아카이브 — 운용사, 날짜, 종목별 상세 정보.",
  alternates: {
    canonical: "https://crady.net/ko/distributions/archive",
    languages: {
      en: "https://crady.net/distributions/archive",
      ko: "https://crady.net/ko/distributions/archive",
      "x-default": "https://crady.net/distributions/archive",
    },
  },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function KoreanDistributionArchivePage() {
  const announcements = await getAllAnnouncements();

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "최신 분배금", url: "https://crady.net/ko/distributions" },
          { name: "아카이브", url: "https://crady.net/ko/distributions/archive" },
        ]}
      />
      <p className="text-sm">
        <Link href="/ko/distributions" className="text-[var(--gray-500)] hover:text-black">
          ← 최신 분배금으로 돌아가기
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold">분배금 발표 아카이브</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1">CRADY가 기록한 모든 공식 분배금 발표 — 최신순.</p>

      <ul className="mt-6 border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)] overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id}>
            <Link
              href={`/ko/distributions/${a.slug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-[var(--gray-500)] mt-0.5">
                  {providerLabel(a.provider_id)} · {formatDate(a.announcement_date)} · {a.etf_count}개 ETF
                </div>
              </div>
              <span className="shrink-0 text-[var(--gray-400)]">→</span>
            </Link>
          </li>
        ))}
        {announcements.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[var(--gray-400)]">아직 기록된 발표가 없습니다.</li>
        )}
      </ul>
    </PageShell>
  );
}

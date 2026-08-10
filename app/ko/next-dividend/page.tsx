import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { getNextDividendBoard } from "@/lib/ticker/nextDividendBoard";
import { NextDividendBoard } from "@/components/nextDividend/NextDividendBoard";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageAppCta } from "@/components/PageAppCta";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF 다음 배당금 · 배당락일 · 지급일",
  description:
    "YieldMax, Roundhill, Defiance 커버드콜 ETF의 다음 예상 배당금, 발표일, 배당락일, 지급일을 한눈에 확인하세요 — 공식 확정과 CRADY 예상을 명확히 구분합니다.",
  alternates: {
    canonical: "https://crady.net/ko/next-dividend",
    languages: {
      en: "https://crady.net/next-dividend",
      ko: "https://crady.net/ko/next-dividend",
      "x-default": "https://crady.net/next-dividend",
    },
  },
  openGraph: {
    title: "ETF 다음 배당금 · 배당락일 · 지급일 | CRADY",
    description: "추적 중인 모든 ETF의 다음 배당 발표일, 배당락일, 지급일을 한 화면에서 확인하세요.",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
};

export default async function NextDividendKoPage() {
  const entries = await getNextDividendBoard();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ETF 다음 배당금",
    itemListElement: entries.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${e.ticker} 다음 배당`,
      url: `https://crady.net/ko/${e.ticker.toLowerCase()}`,
    })),
  };

  return (
    <PageShell paddingY="py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "다음 배당", url: "https://crady.net/ko/next-dividend" },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-[var(--crady-accent)]/15 flex items-center justify-center shrink-0">
          <DollarSign size={22} className="text-[#92400e]" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">다음 배당</h1>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">
            ETF의 다음 예상 배당금과 발표일, 배당락일, 지급일을 한눈에 확인하세요.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <NextDividendBoard entries={entries} lang="ko" basePath="/ko" />
      </div>

      <div className="mt-8">
        <Link href="/ko/prediction-accuracy" className="text-sm font-semibold text-[#92400e] hover:underline">
          CRADY의 과거 예측 정확도 확인하기 →
        </Link>
      </div>

      <PageAppCta lang="ko" />
    </PageShell>
  );
}

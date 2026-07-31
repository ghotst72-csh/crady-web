import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { FooterLanguageLink } from "@/components/i18n/FooterLanguageLink";
import { LanguagePreferenceManager } from "@/components/i18n/LanguagePreferenceManager";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crady.net"),
  title: {
    default: "CRADY — 배당 ETF 정보 플랫폼",
    template: "%s | CRADY",
  },
  description:
    "YieldMax, Roundhill, Defiance 등 고배당 커버드콜 ETF의 배당 일정, 가격, CRADY 점수를 한눈에 확인하세요.",
  openGraph: {
    siteName: "CRADY",
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CRADY",
  url: "https://crady.net",
  logo: "https://crady.net/icon-512.png",
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CRADY",
  url: "https://crady.net/ko",
  inLanguage: "ko",
};

export default async function KoreanRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
        <Header lang="ko" searchIndex={searchIndex} />

        <main className="flex-1">{children}</main>

        <LanguagePreferenceManager lang="ko" />

        <footer className="border-t border-[var(--gray-200)] mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
              <div className="max-w-sm">
                <div className="font-bold text-lg tracking-tight">
                  CRA<span className="text-[#92400e]">DY</span>
                </div>
                <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
                  YieldMax, Roundhill, Defiance 등 고배당 커버드콜 ETF의 배당 일정, 가격, CRADY
                  점수를 데이터 기반으로 제공하는 정보 플랫폼입니다.
                </p>
                <p className="mt-3 text-xs text-[var(--gray-600)]">
                  <FooterLanguageLink target="en" label="View in English" />
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide mb-2">
                    바로가기
                  </div>
                  <ul className="space-y-1.5">
                    <li>
                      <Link href="/ko/ranking" className="text-[var(--gray-600)] hover:text-black">
                        ETF 랭킹
                      </Link>
                    </li>
                    <li>
                      <Link href="/ko/calendar" className="text-[var(--gray-600)] hover:text-black">
                        배당 일정
                      </Link>
                    </li>
                    <li>
                      <Link href="/magazine" className="text-[var(--gray-600)] hover:text-black">
                        매거진 (영문)
                      </Link>
                    </li>
                    <li>
                      <Link href="/ko/about" className="text-[var(--gray-600)] hover:text-black">
                        소개 &amp; 데이터 방법론
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide mb-2">
                    정책
                  </div>
                  <ul className="space-y-1.5">
                    <li>
                      <Link href="/privacy" className="text-[var(--gray-600)] hover:text-black">
                        개인정보처리방침
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="text-[var(--gray-600)] hover:text-black">
                        이용약관
                      </Link>
                    </li>
                    <li>
                      <Link href="/account-deletion" className="text-[var(--gray-600)] hover:text-black">
                        계정 삭제
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--gray-100)] text-xs text-[var(--gray-600)]">
              &copy; 2026 CRADY. 본 사이트의 정보는 투자 권유 또는 금융 자문이 아니며, 실제 투자
              판단은 이용자 본인의 책임입니다.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

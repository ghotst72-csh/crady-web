import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import "./globals.css";

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
  url: "https://crady.net",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://crady.net/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
        <Header />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--gray-200)] mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-sm text-[var(--gray-500)] flex flex-col sm:flex-row gap-4 sm:justify-between">
            <p>&copy; 2026 CRADY. 본 사이트의 정보는 투자 권유가 아닙니다.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-black">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="hover:text-black">
                이용약관
              </Link>
              <Link href="/account-deletion" className="hover:text-black">
                계정 삭제
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

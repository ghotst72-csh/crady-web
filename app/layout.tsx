import type { Metadata } from "next";
import Link from "next/link";
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
};

const NAV = [
  { href: "/ranking", label: "랭킹" },
  { href: "/calendar", label: "배당 일정" },
  { href: "/search", label: "검색" },
  { href: "/about", label: "소개" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col antialiased">
        <header className="border-b border-[var(--gray-200)] sticky top-0 bg-white/95 backdrop-blur z-50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg tracking-tight">
              CRA<span className="text-[var(--crady-accent)]">DY</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 py-1.5 rounded-md text-[var(--gray-600)] hover:text-black hover:bg-[var(--gray-100)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--gray-200)] mt-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 text-sm text-[var(--gray-500)] flex flex-col sm:flex-row gap-4 sm:justify-between">
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

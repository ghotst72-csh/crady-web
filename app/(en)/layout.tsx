import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FooterLanguageLink } from "@/components/i18n/FooterLanguageLink";
import { LanguagePreferenceManager } from "@/components/i18n/LanguagePreferenceManager";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crady.net"),
  title: {
    default: "CRADY | High Dividend ETF Calendar & Distribution Tracker",
    template: "%s | CRADY",
  },
  description:
    "Track YieldMax, Defiance, Roundhill and other high dividend ETFs with estimated distributions, payment calendar and rankings.",
  openGraph: {
    siteName: "CRADY",
    type: "website",
    locale: "en_US",
    alternateLocale: "ko_KR",
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
  inLanguage: "en",
};

export default async function EnglishRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
        <AuthProvider>
        <Header lang="en" searchIndex={searchIndex} />

        {/* min-w-0: body is flex flex-col, and a flex item's implicit
            min-width is auto (its content's intrinsic width), not 0 — a
            deeply nested horizontal-scroll carousel's un-scrolled content
            width would otherwise leak out and stretch the whole page,
            causing page-level horizontal scroll even though the carousel
            itself is correctly clipped by its own overflow-x-auto. See the
            CRADY Mobile UX Final Polish report, Issue 6. */}
        <main className="flex-1 min-w-0">{children}</main>

        <LanguagePreferenceManager lang="en" />

        <footer className="border-t border-[var(--gray-200)] mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
              <div className="max-w-sm">
                <div className="font-bold text-lg tracking-tight">
                  CRA<span className="text-[#92400e]">DY</span>
                </div>
                <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
                  A data platform for high-dividend covered-call ETFs from YieldMax, Roundhill,
                  and Defiance — dividend schedules, prices, and CRADY scores.
                </p>
                <p className="mt-3 text-xs text-[var(--gray-600)]">
                  <FooterLanguageLink target="ko" label="한국어로 보기" />
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide mb-2">
                    Explore
                  </div>
                  <ul className="space-y-1.5">
                    <li>
                      <Link href="/ranking" className="text-[var(--gray-600)] hover:text-black">
                        ETF Ranking
                      </Link>
                    </li>
                    <li>
                      <Link href="/calendar" className="text-[var(--gray-600)] hover:text-black">
                        Dividend Calendar
                      </Link>
                    </li>
                    <li>
                      <Link href="/magazine" className="text-[var(--gray-600)] hover:text-black">
                        Magazine
                      </Link>
                    </li>
                    <li>
                      <Link href="/about" className="text-[var(--gray-600)] hover:text-black">
                        About &amp; Methodology
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wide mb-2">
                    Legal
                  </div>
                  <ul className="space-y-1.5">
                    <li>
                      <Link href="/privacy" className="text-[var(--gray-600)] hover:text-black">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="text-[var(--gray-600)] hover:text-black">
                        Terms of Service
                      </Link>
                    </li>
                    <li>
                      <Link href="/data-terms" className="text-[var(--gray-600)] hover:text-black">
                        Data &amp; Usage Terms
                      </Link>
                    </li>
                    <li>
                      <Link href="/account-deletion" className="text-[var(--gray-600)] hover:text-black">
                        Account Deletion
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--gray-100)] text-xs text-[var(--gray-600)]">
              &copy; 2026 CRADY. The information on this site is not investment advice.
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "ETF 검색",
  description: "티커 또는 ETF명으로 고배당 커버드콜 ETF를 검색하세요.",
  alternates: { canonical: "https://crady.net/search" },
  openGraph: {
    title: "ETF 검색 | CRADY",
    description: "티커 또는 ETF명으로 고배당 커버드콜 ETF를 검색하세요.",
    url: "https://crady.net/search",
    type: "website",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "검색", url: "https://crady.net/search" },
        ]}
      />
      {children}
    </>
  );
}

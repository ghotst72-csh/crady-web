import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-3 text-[var(--gray-600)]">
        We couldn&apos;t find the page or ETF you&apos;re looking for.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-[var(--gray-900)]"
      >
        Back to Home
      </Link>
    </div>
  );
}

import Link from "next/link";

export function ArticleCard({
  href,
  title,
  description,
  date,
  imageSrc,
}: {
  href: string;
  title: string;
  description: string;
  date?: string;
  imageSrc?: string;
}) {
  return (
    <Link
      href={href}
      className="group block border border-[var(--gray-200)] rounded-xl overflow-hidden hover:border-black transition-colors"
    >
      {imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- server-generated PNG (ImageResponse route), not an optimizable static asset
        <img
          src={imageSrc}
          alt={title}
          width={1200}
          height={630}
          className="w-full aspect-[1200/630] object-cover bg-[var(--gray-50)]"
          loading="lazy"
        />
      )}
      <div className="p-4">
        <h3 className="font-bold text-sm sm:text-base group-hover:underline">{title}</h3>
        <p className="mt-1 text-sm text-[var(--gray-500)] line-clamp-2">{description}</p>
        {date && <p className="mt-2 text-xs text-[var(--gray-400)]">{date}</p>}
      </div>
    </Link>
  );
}

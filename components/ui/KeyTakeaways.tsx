/** A small bulleted callout on the site's one established "boxed content"
 * visual signature (border-l-4 accent — the same one ProfileSnippet,
 * AiOutlook, and every Magazine snippet section already use). Each bullet
 * must be backed by a real computed value passed in as a prop — this
 * component has no content of its own, it only lays out what it's given. */
export function KeyTakeaways({
  heading,
  items,
}: {
  heading: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="not-prose border-l-4 border-[var(--crady-accent)] pl-4 py-0.5">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-1.5">
        {heading}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[var(--gray-800)] leading-relaxed flex gap-2">
            <span className="text-[var(--crady-accent)] font-bold shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/** Wraps a single interactive island (vote button, composer, comment
 * actions). Reserves the real control's height up front (CLS guard), then
 * mounts the real client-only content only once the placeholder scrolls
 * near the viewport — the auth/posting JS bundle never loads until then.
 * Never wraps text content: every piece of Activity text (stream entries,
 * post/comment bodies, AI Outlook) renders server-side regardless of where
 * this boundary sits, so nothing here affects crawlability. */
export function LazyMount({
  children,
  minHeight,
  className = "",
}: {
  children: React.ReactNode;
  minHeight: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}

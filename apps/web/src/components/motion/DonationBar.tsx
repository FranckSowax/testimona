'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap/setup';

/**
 * Fundraising progress bar that fills as it scrolls into view (#4, scrub).
 * The fill's scaleX is tied to scroll position over a short range just before
 * the bar reaches the upper viewport. Pure presentation: under reduced-motion
 * the bar simply renders at its final width.
 */
export function DonationBar({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const fill = el?.querySelector<HTMLElement>('[data-fill]');
      if (!el || !fill) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          fill,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              end: 'top 45%',
              scrub: true,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface"
    >
      <div
        data-fill
        className="h-full origin-left rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

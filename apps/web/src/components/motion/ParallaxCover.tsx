'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap/setup';

/**
 * Subtle parallax for the memorial cover photo (#4). The image sits slightly
 * scaled-up and drifts vertically as the page scrolls, adding depth. Pure
 * presentation: scrubbed transform only, disabled under reduced-motion, and
 * the parent's overflow clips the scaled image.
 */
export function ParallaxCover({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const trigger = el?.parentElement;
      if (!el || !trigger) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          el,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger,
              start: 'top bottom',
              end: 'bottom top',
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
    <div ref={ref} className="absolute inset-0 scale-[1.12]">
      <Image src={src} alt="" fill sizes="100vw" priority className="object-cover" />
    </div>
  );
}

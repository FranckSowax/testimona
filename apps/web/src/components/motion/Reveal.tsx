'use client';

import { createElement, useRef, type ElementType, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap/setup';

interface RevealProps {
  /** Wrapper element to render (default: div). Use "ul" to wrap a list. */
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Stagger between children (seconds). */
  stagger?: number;
  /** Initial vertical offset (px). */
  y?: number;
  /** ScrollTrigger start position. */
  start?: string;
}

/**
 * Scroll-reveal wrapper — fades + slides its direct children into view with a
 * stagger as they enter the viewport (ScrollTrigger.batch). Pure presentation:
 *
 *  - Renders its children verbatim (SSR-safe, visible without JS / for SEO).
 *  - useGSAP scopes + auto-cleans everything on unmount.
 *  - gsap.matchMedia() disables motion under prefers-reduced-motion.
 *  - Animates only opacity + transform (60fps, no layout thrash).
 *
 * The from-state is applied inside useGSAP's layout effect (before paint), so
 * there is no flash of fully-visible content.
 */
export function Reveal({
  as = 'div',
  className,
  children,
  stagger = 0.06,
  y = 24,
  start = 'top 88%',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = gsap.utils.toArray<HTMLElement>(el.children);
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(targets, { opacity: 0, y });
        ScrollTrigger.batch(targets, {
          start,
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              stagger,
              overwrite: true,
            }),
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return createElement(as, { ref, className }, children);
}

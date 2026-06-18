'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap/setup';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

interface Props {
  text: string;
  className?: string;
}

/* Rendered as an inline <span> so it can live inside an existing <h1>. */

/**
 * The deceased's name, revealed character-by-character with SplitText — a
 * discreet, dignified entrance for the memorial header (recette polish).
 *
 * Pure presentation: renders a plain <h1>{text}</h1> (SSR/SEO-safe). On the
 * client, SplitText splits + fades the characters in, then reverts on cleanup
 * so the original text node is restored. Disabled under reduced-motion.
 */
export function AnimatedName({ text, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = new SplitText(el, { type: 'words,chars' });
        gsap.from(split.chars, {
          opacity: 0,
          y: 14,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.025,
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

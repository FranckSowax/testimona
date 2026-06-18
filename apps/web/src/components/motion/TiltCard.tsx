'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/gsap/setup';

/**
 * Subtle 3D tilt on pointer move (#7). Maps the cursor position over the card
 * to a small rotateX/rotateY using gsap.utils. Desktop + fine-pointer only and
 * disabled under reduced-motion (gsap.matchMedia). Uses gsap.quickTo for cheap,
 * smooth updates and contextSafe handlers so listeners clean up with the scope.
 */
export function TiltCard({
  children,
  className,
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        gsap.set(el, { transformPerspective: 900, transformOrigin: 'center' });
        const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' });
        const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' });

        const onMove = contextSafe((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = gsap.utils.normalize(0, r.width, e.clientX - r.left);
          const ny = gsap.utils.normalize(0, r.height, e.clientY - r.top);
          rotY(gsap.utils.mapRange(0, 1, -max, max, nx));
          rotX(gsap.utils.mapRange(0, 1, max, -max, ny));
        });
        const onLeave = contextSafe(() => {
          rotY(0);
          rotX(0);
        });

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

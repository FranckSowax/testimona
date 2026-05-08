'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({
  label,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  const positionClasses =
    side === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2';

  return (
    <span
      className={['relative inline-flex', className ?? ''].filter(Boolean).join(' ')}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      <span
        id={id}
        role="tooltip"
        aria-hidden={!visible}
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-[var(--z-dropdown)]',
          'rounded-md bg-foreground/95 text-white text-xs font-medium px-2.5 py-1.5',
          'whitespace-nowrap shadow-[var(--shadow-elevated)]',
          'transition-[opacity,transform] duration-150 ease-[var(--motion-ease-out)]',
          positionClasses,
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
        ].join(' ')}
      >
        {label}
      </span>
    </span>
  );
}

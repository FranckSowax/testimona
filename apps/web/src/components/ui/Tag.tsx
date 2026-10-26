import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'accent' | 'neutral' | 'soft';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  iconLeft?: ReactNode;
}

const TONE: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  neutral: 'bg-foreground/5 text-foreground/80 border-border',
  soft: 'bg-surface text-foreground/80 border-transparent',
};

export function Tag({ tone = 'neutral', iconLeft, className, children, ...rest }: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE[tone],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {iconLeft && <span aria-hidden="true">{iconLeft}</span>}
      {children}
    </span>
  );
}

import type { HTMLAttributes } from 'react';

type Tone = 'primary' | 'accent' | 'neutral' | 'success' | 'warning' | 'destructive';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  count?: number;
  max?: number;
}

const TONE: Record<Tone, string> = {
  primary: 'bg-primary text-primary-foreground',
  accent: 'bg-accent text-accent-foreground',
  neutral: 'bg-foreground/10 text-foreground',
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-white',
  destructive: 'bg-destructive text-destructive-foreground',
};

export function Badge({
  tone = 'accent',
  count,
  max = 99,
  className,
  children,
  ...rest
}: BadgeProps) {
  if (typeof count === 'number' && count <= 0) return null;
  const display =
    typeof count === 'number'
      ? count > max
        ? `${max}+`
        : count.toString()
      : children;
  return (
    <span
      className={[
        'tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
        TONE[tone],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {display}
    </span>
  );
}

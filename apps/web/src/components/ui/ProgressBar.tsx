interface ProgressBarProps {
  value: number;
  max: number;
  ariaLabel: string;
  tone?: 'primary' | 'accent';
  className?: string;
}

/**
 * V2 Progress bar — track gris clair, fill teal #50aac3.
 * Spec : "$ X.XXX raised of $ XX.XXX goal" au-dessus.
 */
export function ProgressBar({
  value,
  max,
  ariaLabel,
  tone = 'primary',
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={[
        'h-2 w-full overflow-hidden rounded-full bg-foreground/10',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'h-full rounded-full transition-[width] duration-500 ease-[var(--motion-ease-out)]',
          tone === 'accent' ? 'bg-accent' : 'bg-primary',
        ].join(' ')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

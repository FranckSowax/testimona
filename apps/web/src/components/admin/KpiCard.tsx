import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'primary' | 'accent';
}

const TONE: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'border-border bg-white',
  primary: 'border-primary/30 bg-primary/5',
  accent: 'border-accent/30 bg-accent/5',
};

export function KpiCard({ label, value, delta, hint, icon, tone = 'default' }: KpiCardProps) {
  return (
    <article
      className={['rounded-lg border p-5 shadow-[var(--shadow-card)]', TONE[tone]].join(' ')}
    >
      <header className="flex items-center justify-between gap-3">
        <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wide">
          {label}
        </p>
        {icon && (
          <span className="text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        )}
      </header>
      <p className="font-display tabular text-foreground mt-3 text-3xl font-bold">{value}</p>
      {(delta || hint) && (
        <div className="mt-2 flex items-baseline gap-2 text-xs">
          {delta && <span className="font-display text-primary font-bold">{delta}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </article>
  );
}

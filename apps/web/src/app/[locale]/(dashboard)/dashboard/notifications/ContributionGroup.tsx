'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface Contributor {
  name: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  /** Optional detail line, e.g. the shop item purchased. */
  detail?: string;
}

interface Props {
  label: string;
  icon: 'donation' | 'shop';
  totalCents: number;
  currency: string;
  count: number;
  contributors: Contributor[];
}

const INITIAL = 5;

function fmt(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Collapsible contribution summary for one memorial (N1-N3): total + the last
 * 5 contributors (most recent first) with a "see all" toggle.
 */
export function ContributionGroup({
  label,
  icon,
  totalCents,
  currency,
  count,
  contributors,
}: Props) {
  const t = useTranslations('dashboard.notifications');
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? contributors : contributors.slice(0, INITIAL);

  // Show one total per currency instead of summing across currencies (which
  // would be wrong — 100 CAD + 50 EUR is not "150 EUR"). Falls back to the
  // passed total/currency when there are no itemised contributors.
  const totalsByCurrency = contributors.reduce<Record<string, number>>((acc, c) => {
    acc[c.currency] = (acc[c.currency] ?? 0) + c.amountCents;
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsByCurrency);
  const totalDisplay =
    totalEntries.length > 0
      ? totalEntries.map(([cur, cents]) => fmt(cents, cur)).join(' · ')
      : fmt(totalCents, currency);

  return (
    <div className="rounded-lg border border-border bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={[
              'inline-flex h-7 w-7 items-center justify-center rounded-full',
              icon === 'donation' ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary',
            ].join(' ')}
          >
            {icon === 'donation' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
            )}
          </span>
          <span className="font-display text-sm font-bold text-foreground">{label}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-foreground tabular">
            {totalDisplay}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 font-display text-[10px] font-bold tabular text-muted-foreground ring-1 ring-border">
            {count}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={['text-muted-foreground transition-transform', open ? 'rotate-180' : ''].join(' ')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-2">
          {contributors.length === 0 ? (
            <p className="py-2 text-xs italic text-muted-foreground">
              {t('contribEmpty')}
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border/60">
                {visible.map((c, i) => (
                  <li key={`${c.createdAt}-${i}`} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-foreground">{c.name}</span>
                      {c.detail && (
                        <span className="truncate text-xs text-muted-foreground">
                          {c.detail}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-display text-sm font-bold text-foreground tabular">
                        {fmt(c.amountCents, c.currency)}
                      </span>
                      <time
                        dateTime={c.createdAt}
                        suppressHydrationWarning
                        className="tabular text-[11px] text-muted-foreground"
                      >
                        {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                      </time>
                    </span>
                  </li>
                ))}
              </ul>
              {contributors.length > INITIAL && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-1 w-full rounded-md py-1.5 text-center font-display text-xs font-bold text-primary hover:underline"
                >
                  {showAll ? t('collapse') : t('seeAll', { count })}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

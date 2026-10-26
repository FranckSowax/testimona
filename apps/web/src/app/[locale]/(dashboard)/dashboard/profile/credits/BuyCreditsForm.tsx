'use client';

import { useActionState } from 'react';
import { buyCreditsDemoAction, type BuyCreditsActionState } from './actions';

interface Props {
  packId: string;
  label: string;
  credits: number;
  priceCents: number;
  /** Per-credit price of the entry-level pack, used to compute the savings %. */
  baselinePerCreditCents: number;
  highlight?: boolean;
}

const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const perCreditFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BuyCreditsForm({
  packId,
  label,
  credits,
  priceCents,
  baselinePerCreditCents,
  highlight,
}: Props) {
  const [state, formAction, isPending] = useActionState<BuyCreditsActionState | null, FormData>(
    buyCreditsDemoAction,
    null,
  );

  const perCreditCents = priceCents / credits;
  const savingsPercent =
    baselinePerCreditCents > 0
      ? Math.round((1 - perCreditCents / baselinePerCreditCents) * 100)
      : 0;

  return (
    <form
      action={formAction}
      className={[
        'flex flex-col items-stretch gap-3 rounded-2xl border-2 bg-white p-5 transition-shadow',
        highlight
          ? 'border-primary shadow-[var(--shadow-card-hover)]'
          : 'border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
      ].join(' ')}
    >
      <input type="hidden" name="packId" value={packId} />
      {highlight && (
        <span className="bg-primary font-display text-primary-foreground inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Recommandé
        </span>
      )}
      <p className="font-display text-foreground text-lg font-bold">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="tabular font-display text-foreground text-3xl font-bold">{credits}</span>
        <span className="text-muted-foreground text-sm">crédits</span>
      </div>
      <div className="space-y-0.5">
        <p>
          <span className="tabular font-display text-foreground text-2xl font-bold">
            {eurFmt.format(priceCents / 100)}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {perCreditFmt.format(perCreditCents / 100)} par crédit
          {savingsPercent > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              −{savingsPercent}%
            </span>
          )}
        </p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="press-scale bg-primary font-display text-primary-foreground mt-2 rounded-md px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Crédit en cours…' : state?.ok ? 'Crédité ✓' : 'Choisir ce pack'}
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}

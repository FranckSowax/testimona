'use client';

import { useActionState } from 'react';
import {
  buyCreditsDemoAction,
  type BuyCreditsActionState,
} from './actions';

interface Props {
  packId: string;
  label: string;
  credits: number;
  priceCents: number;
  highlight?: boolean;
}

export function BuyCreditsForm({
  packId,
  label,
  credits,
  priceCents,
  highlight,
}: Props) {
  const [state, formAction, isPending] = useActionState<
    BuyCreditsActionState | null,
    FormData
  >(buyCreditsDemoAction, null);

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
        <span className="inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Recommandé
        </span>
      )}
      <p className="font-display text-lg font-bold text-foreground">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="tabular font-display text-3xl font-bold text-foreground">
          {credits}
        </span>
        <span className="text-sm text-muted-foreground">crédits</span>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="tabular font-display text-xl font-bold text-foreground">
          {(priceCents / 100).toFixed(0)}€
        </span>
        <span className="ml-1 text-xs">
          (
          {(priceCents / 100 / credits).toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          €/crédit)
        </span>
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="press-scale mt-2 rounded-md bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Crédit en cours…' : state?.ok ? 'Crédité ✓' : 'Choisir ce pack'}
      </button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

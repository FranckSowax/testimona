'use client';

import { useActionState } from 'react';
import {
  topUpStudiaAction,
  type StudiaActionState,
} from './studia-actions';

interface PackProps {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  highlight?: boolean;
}

export function StudiaTopUpForm({
  id,
  label,
  credits,
  priceCents,
  highlight,
}: PackProps) {
  const [state, formAction, isPending] = useActionState<
    StudiaActionState | null,
    FormData
  >(topUpStudiaAction, null);
  return (
    <form
      action={formAction}
      className={[
        'flex flex-col gap-2 rounded-xl border-2 bg-white p-4 transition-shadow',
        highlight
          ? 'border-primary shadow-[var(--shadow-card-hover)]'
          : 'border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
      ].join(' ')}
    >
      <input type="hidden" name="packId" value={id} />
      {highlight && (
        <span className="inline-flex w-fit rounded-full bg-primary px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          Recommandé
        </span>
      )}
      <p className="font-display text-base font-bold text-foreground">
        {label}
      </p>
      <p className="flex items-baseline gap-1">
        <span className="tabular font-display text-2xl font-bold text-foreground">
          {credits}
        </span>
        <span className="text-xs text-muted-foreground">crédits compute</span>
      </p>
      <p className="font-display text-base text-foreground">
        <span className="tabular font-bold">{(priceCents / 100).toFixed(0)}€</span>
        <span className="ml-1 text-xs text-muted-foreground">
          ({(priceCents / 100 / credits).toFixed(2)}€/crédit)
        </span>
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="press-scale mt-1 rounded-md bg-primary px-3 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Crédit…' : state?.ok ? 'Crédité ✓' : 'Recharger'}
      </button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

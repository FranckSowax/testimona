'use client';

import { useActionState } from 'react';
import { topUpStudiaAction, type StudiaActionState } from './studia-actions';

interface PackProps {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  highlight?: boolean;
}

export function StudiaTopUpForm({ id, label, credits, priceCents, highlight }: PackProps) {
  const [state, formAction, isPending] = useActionState<StudiaActionState | null, FormData>(
    topUpStudiaAction,
    null,
  );
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
        <span className="bg-primary font-display text-primary-foreground inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Recommandé
        </span>
      )}
      <p className="font-display text-foreground text-base font-bold">{label}</p>
      <p className="flex items-baseline gap-1">
        <span className="tabular font-display text-foreground text-2xl font-bold">{credits}</span>
        <span className="text-muted-foreground text-xs">crédits compute</span>
      </p>
      <p className="font-display text-foreground text-base">
        <span className="tabular font-bold">{(priceCents / 100).toFixed(0)}€</span>
        <span className="text-muted-foreground ml-1 text-xs">
          ({(priceCents / 100 / credits).toFixed(2)}€/crédit)
        </span>
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="press-scale bg-primary font-display text-primary-foreground mt-1 rounded-md px-3 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Crédit…' : state?.ok ? 'Crédité ✓' : 'Recharger'}
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import {
  adminGrantCreditsAction,
  type AdminCreditActionState,
} from './actions';

export function GrantCreditsForm() {
  const [state, formAction, isPending] = useActionState<
    AdminCreditActionState | null,
    FormData
  >(adminGrantCreditsAction, null);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <label className="block">
        <span className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block">
        <span className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Montant (±)
        </span>
        <input
          name="amount"
          type="number"
          required
          placeholder="10"
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block sm:col-span-3">
        <span className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Note (optionnel)
        </span>
        <input
          name="note"
          maxLength={200}
          placeholder="Bonus support"
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
      </label>
      <div className="sm:col-span-3 sm:flex sm:justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="press-scale rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Application…' : 'Appliquer'}
        </button>
      </div>
      {state?.error && (
        <p
          role="alert"
          className="sm:col-span-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="sm:col-span-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Crédit appliqué ✓
        </p>
      )}
    </form>
  );
}

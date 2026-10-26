'use client';

import { useActionState } from 'react';
import { adminGrantCreditsAction, type AdminCreditActionState } from './actions';

export function GrantCreditsForm() {
  const [state, formAction, isPending] = useActionState<AdminCreditActionState | null, FormData>(
    adminGrantCreditsAction,
    null,
  );
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <label className="block">
        <span className="font-display text-muted-foreground block text-xs font-bold uppercase tracking-wider">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block">
        <span className="font-display text-muted-foreground block text-xs font-bold uppercase tracking-wider">
          Montant (±)
        </span>
        <input
          name="amount"
          type="number"
          required
          placeholder="10"
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block sm:col-span-3">
        <span className="font-display text-muted-foreground block text-xs font-bold uppercase tracking-wider">
          Note (optionnel)
        </span>
        <input
          name="note"
          maxLength={200}
          placeholder="Bonus support"
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
        />
      </label>
      <div className="sm:col-span-3 sm:flex sm:justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="press-scale bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Application…' : 'Appliquer'}
        </button>
      </div>
      {state?.error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm sm:col-span-3"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-3">
          Crédit appliqué ✓
        </p>
      )}
    </form>
  );
}

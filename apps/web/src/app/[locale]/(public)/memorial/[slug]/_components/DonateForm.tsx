'use client';

import { useActionState, useState } from 'react';
import {
  createDonationCheckoutAction,
  type DonationActionState,
} from '@/app/[locale]/(public)/donate/actions';

const PRESETS = [10, 25, 50, 100];

export function DonateForm({
  memorialId,
  slug,
  language = 'fr',
  defaultEmail,
}: {
  memorialId: string;
  slug: string;
  language?: string;
  defaultEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState<DonationActionState | null, FormData>(
    createDonationCheckoutAction,
    null,
  );
  const [amount, setAmount] = useState<number | ''>(25);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-md border border-border p-4">
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="language" value={language} />

      <fieldset>
        <legend className="text-sm font-medium">Montant</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                amount === p
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {p} €
            </button>
          ))}
          <input
            type="number"
            name="amount"
            min={1}
            max={10000}
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            aria-label="Montant personnalisé"
            className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <select
            name="currency"
            defaultValue="EUR"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="donorName" className="block text-sm font-medium">
            Votre nom (facultatif)
          </label>
          <input
            id="donorName"
            name="donorName"
            type="text"
            maxLength={80}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="donorEmail" className="block text-sm font-medium">
            Email (facultatif)
          </label>
          <input
            id="donorEmail"
            name="donorEmail"
            type="email"
            maxLength={100}
            defaultValue={defaultEmail}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="donorMessage" className="block text-sm font-medium">
          Message (facultatif)
        </label>
        <textarea
          id="donorMessage"
          name="message"
          rows={3}
          maxLength={500}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !amount}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Redirection vers Stripe...' : 'Faire un don'}
      </button>
    </form>
  );
}

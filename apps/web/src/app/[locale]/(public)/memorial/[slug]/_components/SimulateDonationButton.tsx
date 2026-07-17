'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  simulateDonationAction,
  type SimulateDonationState,
} from '../../../donate/actions';

const CURRENCIES = ['EUR', 'USD', 'CAD', 'GBP', 'CHF'] as const;

/**
 * Owner-only "test donation" tool. Inserts a Succeeded donation without going
 * through Stripe so the owner can watch the fundraising pot credit and see how
 * different currencies behave. Testing only.
 */
export function SimulateDonationButton({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const t = useTranslations('memorial.simulateDonation');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    SimulateDonationState | null,
    FormData
  >(simulateDonationAction, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press-scale rounded-md border border-dashed border-border px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        title={t('buttonTitle')}
      >
        {t('button')}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-2 w-full space-y-2 rounded-md border border-border bg-surface p-3"
    >
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="slug" value={slug} />
      <p className="font-display text-xs font-bold text-foreground">
        {t('formTitle')}
      </p>
      <div className="flex gap-2">
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          placeholder={t('amount')}
          className="w-24 rounded-md border border-border bg-white px-2 py-1 text-sm"
        />
        <select
          name="currency"
          defaultValue="CAD"
          className="rounded-md border border-border bg-white px-2 py-1 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          name="donorName"
          type="text"
          placeholder={t('namePlaceholder')}
          className="flex-1 rounded-md border border-border bg-white px-2 py-1 text-sm"
        />
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="press-scale rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="press-scale rounded-md bg-primary px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          {isPending ? '…' : t('credit')}
        </button>
      </div>
    </form>
  );
}

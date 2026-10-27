'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reverseEntryAction, type LedgerFormState } from '../actions';
import { isLedgerSpecific } from './ledgerError';
import { useIdempotencyKey } from './useIdempotencyKey';

/** Annule une ligne en deux temps (annuler, puis confirmer) ; l'annulation est définitive. */
export function ReverseButton({ dossierId, entryId }: { dossierId: string; entryId: string }) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    reverseEntryAction,
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [key, renew] = useIdempotencyKey();

  useEffect(() => {
    if (state?.ok) {
      setConfirming(false);
      renew();
    }
  }, [state, renew]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-primary text-sm font-semibold hover:underline"
      >
        {t('entry.reverse')}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <button
        type="submit"
        disabled={pending}
        className="bg-accent rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {t('entry.confirmReverse')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted-foreground text-sm hover:underline"
      >
        {t('entry.keep')}
      </button>
      {state?.error && (
        <p role="alert" className="text-accent-soft w-full text-sm">
          {isLedgerSpecific(state.error) ? t(`errors.${state.error}`) : tErrors(state.error)}
        </p>
      )}
    </form>
  );
}

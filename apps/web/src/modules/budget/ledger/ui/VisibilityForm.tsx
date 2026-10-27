'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { setVisibilityAction, type LedgerFormState } from '../actions';
import { VISIBILITIES, type Visibility } from '../schema';
import { isLedgerSpecific } from './ledgerError';

interface Props {
  dossierId: string;
  visibility: Visibility;
}

/**
 * Réglage du propriétaire : qui voit les montants individuels.
 *
 * @example
 * <VisibilityForm dossierId={id} visibility="restricted" />
 */
export function VisibilityForm({ dossierId, visibility }: Props) {
  const t = useTranslations('ledger.visibility');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    setVisibilityAction,
    null,
  );
  return (
    <form action={formAction} className="border-border space-y-3 rounded-2xl border p-4">
      <input type="hidden" name="dossierId" value={dossierId} />
      <fieldset className="space-y-2">
        <legend className="text-foreground font-semibold">{t('title')}</legend>
        {VISIBILITIES.map((v) => (
          <label key={v} className="text-foreground flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" value={v} defaultChecked={visibility === v} />
            {t(v)}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            styleVariant: 'outline',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('save')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {state?.ok ? t('saved') : ''}
        </p>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {tErrors(isLedgerSpecific(state.error) ? 'unknown' : state.error)}
        </p>
      )}
    </form>
  );
}

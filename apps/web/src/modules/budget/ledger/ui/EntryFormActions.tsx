'use client';

import type { RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import type { EntryLock } from './useEntryLock';

interface Props {
  lock: EntryLock;
  pending: boolean;
  /** Envoi bloqué (clé absente, photo en cours d'envoi ou de lecture). */
  blocked: boolean;
  saved: boolean;
  actionRef: RefObject<HTMLButtonElement | null>;
  onRetry: () => void;
  onContinue: () => void;
}

const BUTTON = buttonClasses({
  variant: 'secondary',
  size: 'md',
  className: 'disabled:cursor-not-allowed disabled:opacity-60',
});

/**
 * Actions du formulaire du registre : « Enregistrer », ou, quand la dépense est enregistrée sans
 * son reçu, « Réessayer de joindre le reçu » (verrou `unlinked`) et « Continuer sans le reçu ».
 *
 * @example
 * <EntryFormActions lock={null} pending={false} blocked={false} saved={false} actionRef={ref}
 *   onRetry={retry} onContinue={reset} />
 */
export function EntryFormActions({
  lock,
  pending,
  blocked,
  saved,
  actionRef,
  onRetry,
  onContinue,
}: Props) {
  const t = useTranslations('ledger.form');
  const tReceipts = useTranslations('receipts.unlinked');
  return (
    <div className="space-y-3">
      {lock && <p className="text-foreground text-sm">{tReceipts('frozen')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {lock === null && (
          <button
            type="submit"
            disabled={pending || blocked}
            aria-busy={pending || undefined}
            className={BUTTON}
          >
            {t('submit')}
          </button>
        )}
        {lock === 'unlinked' && (
          <button
            ref={actionRef}
            type="button"
            onClick={onRetry}
            disabled={pending}
            aria-busy={pending || undefined}
            className={BUTTON}
          >
            {tReceipts('retry')}
          </button>
        )}
        {lock && (
          <button
            ref={lock === 'final' ? actionRef : undefined}
            type="button"
            onClick={onContinue}
            disabled={pending}
            className={BUTTON}
          >
            {tReceipts('continue')}
          </button>
        )}
        <p role="status" className="text-foreground text-sm">
          {saved ? t('saved') : ''}
        </p>
      </div>
    </div>
  );
}

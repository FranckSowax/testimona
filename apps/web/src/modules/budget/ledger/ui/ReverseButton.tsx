'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reverseEntryAction, type LedgerFormState } from '../actions';
import { isLedgerSpecific } from './ledgerError';
import { useIdempotencyKey } from './useIdempotencyKey';

interface Props {
  dossierId: string;
  entryId: string;
  /** Description courte de la ligne (nom, type, montant), pour distinguer les boutons. */
  label: string;
}

interface ConfirmProps {
  dossierId: string;
  entryId: string;
  idempotencyKey: string;
  onKeep: () => void;
  onDone: () => void;
}

/** Formulaire de confirmation ; remonté à chaque ouverture pour repartir sans erreur. */
function ConfirmForm({ dossierId, entryId, idempotencyKey, onKeep, onDone }: ConfirmProps) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    reverseEntryAction,
    null,
  );
  const keepRef = useRef<HTMLButtonElement>(null);
  const warningId = useId();

  // WHY: le focus suit l'ouverture, sur le choix sans risque (« Garder »).
  useEffect(() => keepRef.current?.focus(), []);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p id={warningId} className="text-foreground w-full text-sm">
        {t('entry.reverseWarning')}
      </p>
      <button
        type="submit"
        disabled={pending || idempotencyKey === ''}
        aria-busy={pending || undefined}
        aria-describedby={warningId}
        className="bg-destructive text-destructive-foreground rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? t('entry.reversing') : t('entry.confirmReverse')}
      </button>
      <button
        ref={keepRef}
        type="button"
        onClick={onKeep}
        className="text-foreground text-sm underline underline-offset-2"
      >
        {t('entry.keep')}
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {isLedgerSpecific(state.error) ? t(`errors.${state.error}`) : tErrors(state.error)}
        </p>
      )}
    </form>
  );
}

/** Annule une ligne en deux temps (annuler, puis confirmer) ; l'annulation est définitive. */
export function ReverseButton({ dossierId, entryId, label }: Props) {
  const t = useTranslations('ledger');
  const [confirming, setConfirming] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [key, renew] = useIdempotencyKey();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusTrigger = useRef(false);

  // WHY: à la fermeture, le focus revient sur le bouton qui a ouvert la confirmation.
  useEffect(() => {
    if (!confirming && focusTrigger.current) {
      focusTrigger.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  const close = useCallback(() => {
    focusTrigger.current = true;
    setConfirming(false);
    setAttempt((n) => n + 1);
  }, []);
  const done = useCallback(() => {
    renew();
    close();
  }, [renew, close]);

  if (!confirming) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t('entry.reverseLabel', { entry: label })}
        className="text-secondary text-sm font-semibold underline underline-offset-2"
      >
        {t('entry.reverse')}
      </button>
    );
  }
  return (
    <ConfirmForm
      key={attempt}
      dossierId={dossierId}
      entryId={entryId}
      idempotencyKey={key}
      onKeep={close}
      onDone={done}
    />
  );
}

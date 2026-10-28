'use client';

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { deleteLineAction, type LinesFormState } from '../actions';
import { useOnLineDeleted } from './LineDeletedAnnouncer';
import { linesErrorText } from './linesError';

interface Props {
  dossierId: string;
  lineId: string;
  /** Libellé du poste, pour distinguer les boutons. */
  label: string;
}

interface ConfirmProps {
  dossierId: string;
  lineId: string;
  label: string;
  onKeep: () => void;
  onDone: () => void;
}

/** Formulaire de confirmation ; remonté à chaque ouverture pour repartir sans erreur. */
function ConfirmForm({ dossierId, lineId, label, onKeep, onDone }: ConfirmProps) {
  const t = useTranslations('lines.form');
  const tRoot = useTranslations();
  const onDeleted = useOnLineDeleted();
  // WHY: le succès est signalé dans l'action elle-même : la revalidation retire le poste, et ce
  // formulaire, avant qu'un effet sur l'état ait pu s'exécuter.
  const [state, formAction, pending] = useActionState<LinesFormState | null, FormData>(
    async (prev, formData) => {
      const res = await deleteLineAction(prev, formData);
      if (res.ok) onDeleted();
      return res;
    },
    null,
  );
  const keepRef = useRef<HTMLButtonElement>(null);
  const warningId = useId();

  // WHY: le focus suit l'ouverture, sur le choix sans risque (« Garder »).
  useEffect(() => keepRef.current?.focus(), []);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  // WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="lineId" value={lineId} />
      <p id={warningId} className="text-foreground w-full text-sm">
        {t('deleteWarning')}
      </p>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        aria-describedby={warningId}
        aria-label={pending ? undefined : t('confirmDeleteLabel', { label })}
        className="bg-destructive text-destructive-foreground rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? t('deleting') : t('confirmDelete')}
      </button>
      <button
        ref={keepRef}
        type="button"
        onClick={onKeep}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        {t('keep')}
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {linesErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}

/**
 * Supprime un poste en deux temps (supprimer, puis confirmer) ; la suppression est définitive.
 * WHY: pas de clé d'idempotence : une suppression rejouée échoue proprement en `not_found`.
 *
 * @example
 * <DeleteLineButton dossierId={id} lineId={line.id} label="Cercueil" />
 */
export function DeleteLineButton({ dossierId, lineId, label }: Props) {
  const t = useTranslations('lines.form');
  const [confirming, setConfirming] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
  // WHY: après une suppression, le focus va à l'annonceur (LineDeletedAnnouncer), pas au déclencheur.
  const done = useCallback(() => {
    setConfirming(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!confirming) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t('delete', { label })}
        className="text-secondary text-sm font-semibold underline underline-offset-2"
      >
        {t('deleteShort')}
      </button>
    );
  }
  return (
    <ConfirmForm
      key={attempt}
      dossierId={dossierId}
      lineId={lineId}
      label={label}
      onKeep={close}
      onDone={done}
    />
  );
}

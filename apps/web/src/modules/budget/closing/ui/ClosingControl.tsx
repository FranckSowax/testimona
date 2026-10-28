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
import { closeLedgerAction, reopenLedgerAction } from '../actions';
import type { ClosingFormState } from '../service';
import { closingErrorText } from './closingError';

interface Props {
  dossierId: string;
  closed: boolean;
  /** Propriétaire du dossier : seul à pouvoir rouvrir. */
  canReopen: boolean;
}

type Action = (prev: ClosingFormState | null, data: FormData) => Promise<ClosingFormState>;

/** État d'une action de clôture, envoi par onSubmit, rappel en cas de succès. */
function useClosingForm(action: Action, onDone: () => void) {
  const [state, formAction, pending] = useActionState<ClosingFormState | null, FormData>(
    action,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  // WHY: onSubmit plutôt que `<form action>` : React 19 réinitialise le formulaire après chaque
  // action, même en erreur.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, pending, onSubmit };
}

/** Clôture en deux temps (clôturer, puis confirmer), avec l'avertissement. */
function CloseForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const t = useTranslations('closing.control');
  const tAll = useTranslations();
  const [confirming, setConfirming] = useState(false);
  const { state, pending, onSubmit } = useClosingForm(closeLedgerAction, onDone);
  const openRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const warningId = useId();

  // WHY: le focus suit l'ouverture, sur le choix sans risque (« Garder ouvert »), et revient au
  // bouton d'ouverture quand la personne renonce.
  useEffect(() => {
    if (confirming) {
      keepRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        ref={openRef}
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClasses({ variant: 'secondary', size: 'md' })}
      >
        {t('close')}
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="dossierId" value={dossierId} />
      <p id={warningId} className="text-foreground text-sm">
        {t('closeWarning')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-describedby={warningId}
          className="bg-destructive text-destructive-foreground rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? t('closing') : t('confirmClose')}
        </button>
        <button
          ref={keepRef}
          type="button"
          onClick={() => {
            returnFocus.current = true;
            setConfirming(false);
          }}
          className={buttonClasses({ variant: 'secondary', styleVariant: 'outline', size: 'md' })}
        >
          {t('keepOpen')}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {closingErrorText(state.error, (key) => tAll(key))}
        </p>
      )}
    </form>
  );
}

/** Réouverture par le propriétaire. */
function ReopenForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const t = useTranslations('closing.control');
  const tAll = useTranslations();
  const { state, pending, onSubmit } = useClosingForm(reopenLedgerAction, onDone);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <p className="text-foreground text-sm">{t('reopenHint')}</p>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={buttonClasses({
          variant: 'secondary',
          size: 'md',
          className: 'disabled:cursor-not-allowed disabled:opacity-60',
        })}
      >
        {pending ? t('reopening') : t('reopen')}
      </button>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {closingErrorText(state.error, (key) => tAll(key))}
        </p>
      )}
    </form>
  );
}

/**
 * Clôture (trésorier et plus) et réouverture (propriétaire) des cotisations.
 * WHY: la zone d'annonce vit ici, hors des formulaires : après la clôture, la page revalidée
 * remplace le formulaire de clôture, et l'annonce doit survivre à ce remplacement.
 *
 * @example
 * <ClosingControl dossierId={id} closed={false} canReopen={role === 'owner'} />
 */
export function ClosingControl({ dossierId, closed, canReopen }: Props) {
  const t = useTranslations('closing.control');
  const titleId = useId();
  const [announcement, setAnnouncement] = useState('');
  const onClosed = useCallback(() => setAnnouncement(t('closed')), [t]);
  const onReopened = useCallback(() => setAnnouncement(t('reopened')), [t]);
  return (
    <section aria-labelledby={titleId} className="border-border space-y-3 rounded-2xl border p-4">
      <h2 id={titleId} className="font-display text-foreground text-lg font-semibold">
        {t('title')}
      </h2>
      {!closed && <CloseForm dossierId={dossierId} onDone={onClosed} />}
      {closed && canReopen && <ReopenForm dossierId={dossierId} onDone={onReopened} />}
      {closed && !canReopen && <p className="text-foreground text-sm">{t('reopenOwnerOnly')}</p>}
      <p role="status" className="text-foreground text-sm">
        {announcement}
      </p>
    </section>
  );
}

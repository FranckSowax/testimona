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
import type { ClosingError, ClosingFormState } from '../service';
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
  // WHY: numéro d'envoi, utilisé comme `key` de l'alerte : une même erreur renvoyée deux fois
  // remonte un nouveau nœud et se fait réannoncer par les lecteurs d'écran.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  // WHY: onSubmit plutôt que `<form action>` : React 19 réinitialise le formulaire après chaque
  // action, même en erreur.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    setAttempt((n) => n + 1);
    startTransition(() => formAction(data));
  };
  // WHY: l'ancienne erreur disparaît pendant un nouvel envoi, pour ne pas la croire actuelle.
  const error = pending ? undefined : state?.error;
  return { error, attempt, pending, onSubmit };
}

/** Erreur d'une action de clôture, annoncée à chaque nouvel envoi. */
function ClosingAlert({ error, attempt }: { error: ClosingError | undefined; attempt: number }) {
  const tAll = useTranslations();
  if (!error) return null;
  return (
    <p key={attempt} role="alert" className="text-destructive text-sm">
      {closingErrorText(error, (key) => tAll(key))}
    </p>
  );
}

interface FormProps {
  dossierId: string;
  onDone: () => void;
}

/** Clôture en deux temps (clôturer, puis confirmer), avec l'avertissement. */
function CloseForm({ dossierId, onDone, onStart }: FormProps & { onStart: () => void }) {
  const t = useTranslations('closing.control');
  const [confirming, setConfirming] = useState(false);
  const { error, attempt, pending, onSubmit } = useClosingForm(closeLedgerAction, onDone);
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
        onClick={() => {
          onStart();
          setConfirming(true);
        }}
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
          className={buttonClasses({
            variant: 'destructive',
            size: 'md',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {pending ? t('closing') : t('confirmClose')}
        </button>
        <button
          ref={keepRef}
          type="button"
          disabled={pending}
          onClick={() => {
            // WHY: renoncer pendant l'envoi n'annulerait rien : la clôture partirait quand même.
            if (pending) return;
            returnFocus.current = true;
            setConfirming(false);
          }}
          className={buttonClasses({
            variant: 'secondary',
            styleVariant: 'outline',
            size: 'md',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('keepOpen')}
        </button>
      </div>
      <ClosingAlert error={error} attempt={attempt} />
    </form>
  );
}

/** Réouverture par le propriétaire. */
function ReopenForm({ dossierId, onDone }: FormProps) {
  const t = useTranslations('closing.control');
  const { error, attempt, pending, onSubmit } = useClosingForm(reopenLedgerAction, onDone);
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
      <ClosingAlert error={error} attempt={attempt} />
    </form>
  );
}

/**
 * Clôture (trésorier et plus) et réouverture (propriétaire) des cotisations.
 * WHY: la zone d'annonce vit ici, hors des formulaires : après la clôture, la page revalidée
 * remplace le formulaire de clôture, et l'annonce doit survivre à ce remplacement. Pour la même
 * raison, le focus va sur le titre, qui reste en place quand le formulaire disparaît.
 *
 * @example
 * <ClosingControl dossierId={id} closed={false} canReopen={role === 'owner'} />
 */
export function ClosingControl({ dossierId, closed, canReopen }: Props) {
  const t = useTranslations('closing.control');
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const onClosed = useCallback(() => {
    setAnnouncement(t('closed'));
    titleRef.current?.focus();
  }, [t]);
  const onReopened = useCallback(() => {
    setAnnouncement(t('reopened'));
    titleRef.current?.focus();
  }, [t]);
  const onStart = useCallback(() => setAnnouncement(''), []);
  return (
    <section aria-labelledby={titleId} className="border-border space-y-3 rounded-2xl border p-4">
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="font-display text-foreground text-lg font-semibold"
      >
        {t('title')}
      </h2>
      {!closed && <CloseForm dossierId={dossierId} onDone={onClosed} onStart={onStart} />}
      {closed && canReopen && <ReopenForm dossierId={dossierId} onDone={onReopened} />}
      {closed && !canReopen && <p className="text-foreground text-sm">{t('reopenOwnerOnly')}</p>}
      <p role="status" className="text-foreground text-sm">
        {announcement}
      </p>
    </section>
  );
}

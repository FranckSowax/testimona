'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { type QuoteFormState, requestQuoteAction } from '../quote-actions';
import { QUOTE_MESSAGE_MAX } from '../quote-message';
import type { QuoteStep } from '../quotes/repo';
import { quoteErrorText } from './quoteError';

interface Props {
  dossierId: string;
  providerId: string;
  providerName: string;
  stepId: QuoteStep;
  /** Message préparé côté serveur, modifiable par la famille. */
  message: string;
}

/**
 * « Demander un devis » : le message préparé s'affiche, la famille le relit, puis « Ouvrir
 * WhatsApp » trace la demande et ouvre `wa.me`. Le lien reste affiché si l'ouverture échoue.
 * WHY: le numéro n'est jamais une prop ; seul le lien renvoyé par l'action, après la trace,
 * le contient.
 *
 * @example
 * <QuoteRequestForm dossierId={id} providerId={p.id} providerName={p.name}
 *   stepId="vigil-setup" message={message} />
 */
export function QuoteRequestForm(props: Props) {
  const t = useTranslations('providers.quote');
  const [open, setOpen] = useState(false);
  const requestRef = useRef<HTMLButtonElement>(null);
  // WHY: le focus ne revient au bouton qu'après « Annuler », pas au premier rendu de la page.
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      requestRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <button
        ref={requestRef}
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        {t('request')}
      </button>
    );
  }

  // WHY: le sous-formulaire est démonté à la fermeture ; son état d'action (lien, erreur) repart
  // donc de zéro à la réouverture, sans lien ni erreur périmés.
  return (
    <QuoteForm
      {...props}
      onCancel={() => {
        restoreFocus.current = true;
        setOpen(false);
      }}
    />
  );
}

function QuoteForm({
  dossierId,
  providerId,
  providerName,
  stepId,
  message,
  onCancel,
}: Props & { onCancel: () => void }) {
  const t = useTranslations('providers.quote');
  const tRoot = useTranslations();
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // WHY: `pending` ne change qu'au rendu suivant ; deux envois rapprochés passeraient tous deux
  // et traceraient deux demandes. La ref bloque de façon synchrone.
  const submitting = useRef(false);
  const [state, formAction, pending] = useActionState<QuoteFormState | null, FormData>(
    requestQuoteAction,
    null,
  );

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  // WHY: l'ouverture suit l'aller-retour serveur ; un bloqueur de fenêtres peut la refuser,
  // d'où le lien affiché en dessous.
  useEffect(() => {
    if (state?.href) window.open(state.href, '_blank', 'noopener,noreferrer');
  }, [state]);

  // WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
  // et la famille perdrait le message qu'elle a modifié.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || submitting.current) return;
    submitting.current = true;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const hasError = Boolean(state?.error);

  return (
    <form onSubmit={submit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="providerId" value={providerId} />
      <input type="hidden" name="stepId" value={stepId} />
      <label htmlFor={fieldId} className="text-foreground block text-sm font-semibold">
        {t('messageLabel', { name: providerName })}
      </label>
      <p id={hintId} className="text-muted-foreground text-xs">
        {t('messageHint')}
      </p>
      <textarea
        ref={fieldRef}
        id={fieldId}
        name="message"
        defaultValue={message}
        required
        maxLength={QUOTE_MESSAGE_MAX}
        rows={8}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${hintId} ${errorId}` : hintId}
        className="border-border bg-background text-foreground w-full rounded-lg border p-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'primary',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {pending ? t('opening') : state?.ok ? t('resend') : t('open')}
        </button>
        {/* WHY: annuler pendant l'envoi démonterait le formulaire et perdrait le lien d'une
            demande pourtant tracée. */}
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonClasses({
            variant: 'secondary',
            styleVariant: 'ghost',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('cancel')}
        </button>
      </div>
      <div role="status" className="text-foreground text-sm">
        {state?.href && (
          <p>
            {t('opened')}{' '}
            <a
              href={state.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold underline"
            >
              {t('link', { name: providerName })}
            </a>
          </p>
        )}
      </div>
      {state?.error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {quoteErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}

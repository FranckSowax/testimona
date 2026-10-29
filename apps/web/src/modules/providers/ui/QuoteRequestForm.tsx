'use client';

import { startTransition, useActionState, useEffect, useId, useState, type FormEvent } from 'react';
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
export function QuoteRequestForm({ dossierId, providerId, providerName, stepId, message }: Props) {
  const t = useTranslations('providers.quote');
  const tRoot = useTranslations();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<QuoteFormState | null, FormData>(
    requestQuoteAction,
    null,
  );

  // WHY: l'ouverture suit l'aller-retour serveur ; un bloqueur de fenêtres peut la refuser,
  // d'où le lien affiché en dessous.
  useEffect(() => {
    if (state?.href) window.open(state.href, '_blank', 'noopener,noreferrer');
  }, [state]);

  // WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
  // et la famille perdrait le message qu'elle a modifié.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        {t('request')}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="providerId" value={providerId} />
      <input type="hidden" name="stepId" value={stepId} />
      <label htmlFor={fieldId} className="text-foreground block text-sm font-semibold">
        {t('messageLabel', { name: providerName })}
      </label>
      <p id={`${fieldId}-hint`} className="text-muted-foreground text-xs">
        {t('messageHint')}
      </p>
      <textarea
        id={fieldId}
        name="message"
        defaultValue={message}
        required
        maxLength={QUOTE_MESSAGE_MAX}
        rows={8}
        aria-describedby={`${fieldId}-hint`}
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
          {pending ? t('opening') : t('open')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClasses({ variant: 'secondary', styleVariant: 'ghost', size: 'sm' })}
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
        <p role="alert" className="text-destructive text-sm">
          {quoteErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}

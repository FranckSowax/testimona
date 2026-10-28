'use client';

import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { LedgerFormState } from '../actions';
import { FIELD_MESSAGES, isLedgerSpecific } from './ledgerError';

/** Classes d'un champ de saisie du registre. */
export const FIELD =
  'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2 disabled:opacity-60';
const LABEL = 'text-foreground text-sm';

/**
 * Champs accessibles d'un formulaire du registre : identifiants, libellés, erreur sous chaque
 * champ et erreur générale.
 * WHY: sorti d'EntryForm (limite de 300 lignes) ; le comportement est inchangé.
 *
 * @example
 * const { uid, a11y, wrap, input, generalError } = useEntryFields(state, ['amount', 'note']);
 */
export function useEntryFields(state: LedgerFormState | null, shown: readonly string[]) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const uid = useId();

  const fieldError = (name: string): string | null => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const textKey = FIELD_MESSAGES[message];
    return textKey ? t(textKey) : tErrors('validation');
  };
  const idOf = (name: string) => `${uid}-${name}`;
  const errorIdOf = (name: string) => `${uid}-${name}-error`;
  const a11y = (name: string, hintId?: string) => {
    const error = fieldError(name);
    const describedBy = [hintId, error ? errorIdOf(name) : undefined].filter(Boolean).join(' ');
    return {
      id: idOf(name),
      name,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
    } as const;
  };
  const wrap = (name: string, label: string, control: ReactNode, hint?: ReactNode) => {
    const error = fieldError(name);
    return (
      <div className="space-y-1">
        <label htmlFor={idOf(name)} className={`block ${LABEL}`}>
          {label}
        </label>
        {control}
        {hint}
        {error && (
          <p id={errorIdOf(name)} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  };
  const input = (name: string, label: string, props: InputHTMLAttributes<HTMLInputElement>) =>
    wrap(name, label, <input className={FIELD} {...a11y(name)} {...props} />);

  // WHY: une erreur de champ caché (dossier, clé) n'a pas de place à côté d'un champ visible.
  const hasShownFieldError = Object.keys(state?.fieldErrors ?? {}).some((n) => shown.includes(n));
  const generalError =
    state?.error && !hasShownFieldError
      ? isLedgerSpecific(state.error)
        ? t(`errors.${state.error}`)
        : tErrors(state.error)
      : null;

  return { uid, a11y, wrap, input, generalError };
}

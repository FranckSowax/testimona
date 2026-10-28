'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { addLineAction, saveLineAction } from '../actions';
import { linesErrorText } from './linesError';
import { useLinesForm } from './useLinesForm';

const FIELD = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

const FIELD_MESSAGES: Record<string, string> = {
  'invalid number': 'errors.invalidNumber',
  'out of range': 'errors.outOfRange',
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
};

interface Props {
  dossierId: string;
  /** Poste modifié ; absent pour ajouter un poste libre. */
  line?: { id: string; label: string; amounts: Readonly<Record<Level, number>> };
}

/**
 * Libellé et montant par niveau d'un poste : modification d'un poste existant ou ajout d'un poste
 * libre (le formulaire se vide après un ajout réussi).
 *
 * @example
 * <LineForm dossierId={id} line={{ id, label: 'Cercueil', amounts }} />
 */
export function LineForm({ dossierId, line }: Props) {
  const t = useTranslations('lines');
  const tErrors = useTranslations('dossier.errors');
  const tRoot = useTranslations();
  const { state, pending, saved, onSubmit, clearSaved, formRef } = useLinesForm(
    line ? saveLineAction : addLineAction,
    !line,
  );
  const uid = useId();
  const fieldError = (name: string) => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const key = FIELD_MESSAGES[message];
    return key ? t(key) : tErrors('validation');
  };
  const field = (name: string, label: string, defaultValue: string, numeric: boolean) => {
    const error = fieldError(name);
    const id = `${uid}-${name}`;
    return (
      <div key={name} className="space-y-1">
        <label htmlFor={id} className="text-foreground block text-sm">
          {label}
        </label>
        <input
          id={id}
          name={name}
          defaultValue={defaultValue}
          inputMode={numeric ? 'numeric' : undefined}
          maxLength={numeric ? undefined : 120}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={FIELD}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  };
  const hasFieldError = Object.keys(state?.fieldErrors ?? {}).length > 0;
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={clearSaved}
      noValidate
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="dossierId" value={dossierId} />
      {line && <input type="hidden" name="lineId" value={line.id} />}
      {field('label', t('form.label'), line?.label ?? '', false)}
      {LEVELS.map((level) =>
        field(level, t(`form.${level}`), line ? String(line.amounts[level]) : '', true),
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'sm',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {line ? t('form.save') : t('form.add')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? (line ? t('form.saved') : t('form.added')) : ''}
        </p>
      </div>
      {state?.error && !hasFieldError && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {linesErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}

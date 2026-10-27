'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDossierAction, type FormState } from '../actions';
import { RELATIONSHIPS } from '../schema';

interface Props {
  entryPoint: 'death' | 'prepare';
  countries: { code: string; label: string }[];
}

type FieldName = 'firstName' | 'lastName' | 'city' | 'relationship';

const STEPS = [['firstName', 'lastName'], ['city'], ['relationship']] as const;
const MAX_LENGTH = 120;

const INPUT_CLASS =
  'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 aria-[invalid=true]:border-accent-soft';

/**
 * Assistant de création d'un dossier en trois écrans (qui, où, quel lien).
 *
 * Les trois fieldsets restent dans le DOM (`hidden`) : tous les champs partent avec le formulaire,
 * et la validation serveur reste l'autorité (les contrôles d'ici ne servent qu'à guider).
 *
 * @example
 * <NewDossierWizard entryPoint="death" countries={[{ code: 'GA', label: 'Gabon' }]} />
 */
export function NewDossierWizard({ entryPoint, countries }: Props) {
  const t = useTranslations('dossier');
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    createDossierAction,
    null,
  );
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    countryCode: countries[0]?.code ?? 'GA',
    city: '',
    relationship: '',
  });
  const [missing, setMissing] = useState<FieldName[]>([]);
  const fieldsets = useRef<(HTMLFieldSetElement | null)[]>([]);
  const moved = useRef(false);

  const set = (name: keyof typeof values) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
    setMissing((m) => m.filter((f) => f !== name));
  };

  const isEmpty = (name: FieldName) => values[name].trim() === '';

  // WHY: le focus suit l'écran affiché, sinon un lecteur d'écran reste sur un bouton disparu.
  useEffect(() => {
    if (!moved.current) return;
    fieldsets.current[step]?.focus();
  }, [step]);

  // WHY: si le serveur refuse un champ, on ramène la personne à l'écran concerné.
  useEffect(() => {
    const keys = Object.keys(state?.fieldErrors ?? {});
    if (keys.length === 0) return;
    const target = STEPS.findIndex((names) => names.some((n) => keys.includes(n)));
    setMissing(keys.filter((k): k is FieldName => STEPS.flat().some((n) => n === k)));
    if (target >= 0) {
      moved.current = true;
      setStep(target);
    }
  }, [state]);

  const goTo = (index: number) => {
    moved.current = true;
    setStep(index);
  };

  const next = () => {
    const empty = (STEPS[step] ?? []).filter(isEmpty);
    setMissing(empty);
    if (empty.length > 0) {
      document.getElementById(`wizard-${empty[0]}`)?.focus();
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const invalid = (name: FieldName) => missing.includes(name);
  const fieldProps = (name: FieldName) => ({
    id: `wizard-${name}`,
    name,
    value: values[name],
    onChange: set(name),
    required: true,
    maxLength: MAX_LENGTH,
    'aria-invalid': invalid(name),
    'aria-describedby': invalid(name) ? `wizard-${name}-error` : undefined,
    className: INPUT_CLASS,
  });
  const fieldError = (name: FieldName) =>
    invalid(name) && (
      <p id={`wizard-${name}-error`} className="text-accent-soft text-sm">
        {t('new.required')}
      </p>
    );
  const fieldsetProps = (index: number) => ({
    ref: (el: HTMLFieldSetElement | null) => {
      fieldsets.current[index] = el;
    },
    hidden: step !== index,
    tabIndex: -1,
    className: 'space-y-4 focus:outline-none',
  });
  const legendClass = 'font-display text-2xl font-bold';

  return (
    <form
      action={formAction}
      noValidate
      className="bg-secondary text-secondary-foreground mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6 rounded-3xl p-6 sm:p-10"
    >
      <input type="hidden" name="entryPoint" value={entryPoint} />
      <p className="text-sm text-white/60" aria-live="polite">
        {step + 1} / {STEPS.length}
      </p>

      <fieldset {...fieldsetProps(0)}>
        <legend className={legendClass}>{t('new.whoTitle')}</legend>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.firstName')}</span>
          <input {...fieldProps('firstName')} autoComplete="off" />
        </label>
        {fieldError('firstName')}
        <label className="block space-y-1">
          <span className="text-sm">{t('new.lastName')}</span>
          <input {...fieldProps('lastName')} autoComplete="off" />
        </label>
        {fieldError('lastName')}
      </fieldset>

      <fieldset {...fieldsetProps(1)}>
        <legend className={legendClass}>{t('new.whereTitle')}</legend>
        <p className="text-sm text-white/70">{t('new.whereHint')}</p>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.country')}</span>
          <select
            id="wizard-countryCode"
            name="countryCode"
            value={values.countryCode}
            onChange={set('countryCode')}
            className={INPUT_CLASS}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code} className="text-foreground">
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm">{t('new.city')}</span>
          <input {...fieldProps('city')} autoComplete="off" />
        </label>
        {fieldError('city')}
      </fieldset>

      <fieldset
        {...fieldsetProps(2)}
        className="space-y-3 focus:outline-none"
        aria-describedby={invalid('relationship') ? 'wizard-relationship-error' : undefined}
      >
        <legend className={legendClass}>{t('new.relationshipTitle')}</legend>
        {RELATIONSHIPS.map((r) => (
          <label
            key={r}
            className={`has-[:focus-visible]:ring-accent-soft block cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:ring-2 ${
              values.relationship === r
                ? 'text-foreground border-white bg-white font-semibold'
                : 'border-white/30'
            }`}
          >
            <input
              type="radio"
              name="relationship"
              value={r}
              checked={values.relationship === r}
              onChange={set('relationship')}
              className="sr-only"
            />
            {t(`new.relationships.${r}`)}
          </label>
        ))}
        {fieldError('relationship')}
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-accent-soft text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(Math.max(step - 1, 0))}
          disabled={step === 0}
          className="text-sm text-white/70 disabled:invisible"
        >
          ← {t('new.back')}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white"
          >
            {t('new.next')}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            onClick={(e) => {
              if (isEmpty('relationship')) {
                e.preventDefault();
                setMissing(['relationship']);
              }
            }}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {t('new.submit')}
          </button>
        )}
      </div>
    </form>
  );
}

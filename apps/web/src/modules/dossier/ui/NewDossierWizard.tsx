'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localizedPath } from '@/lib/auth/redirect-target';
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
  const tHeader = useTranslations('header');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    createDossierAction,
    null,
  );
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    countryCode: countries[0]?.code ?? '',
    city: '',
    relationship: '',
  });
  const [missing, setMissing] = useState<FieldName[]>([]);
  // WHY: le focus est donné après le rendu, quand aria-invalid et aria-describedby sont posés.
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null);
  // WHY: une `key` qui change à chaque retour du serveur force la réannonce d'une même erreur.
  const [errorSeq, setErrorSeq] = useState(0);

  const set = (name: keyof typeof values) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
    setMissing((m) => m.filter((f) => f !== name));
  };

  const isEmpty = (name: FieldName) => values[name].trim() === '';
  const focusId = (id: string) => setFocus((f) => ({ id, seq: (f?.seq ?? 0) + 1 }));
  const fieldId = (name: FieldName) =>
    name === 'relationship' ? 'wizard-relationship-first' : `wizard-${name}`;

  useEffect(() => {
    if (focus) document.getElementById(focus.id)?.focus();
  }, [focus]);

  // WHY: si le serveur refuse un champ, on ramène la personne au premier champ fautif.
  useEffect(() => {
    if (!state) return;
    setErrorSeq((n) => n + 1);
    const keys = Object.keys(state.fieldErrors ?? {});
    const first = STEPS.flat().find((n) => keys.includes(n));
    if (!first) return;
    setMissing(STEPS.flat().filter((n) => keys.includes(n)));
    setStep(STEPS.findIndex((names) => (names as readonly string[]).includes(first)));
    focusId(fieldId(first));
  }, [state]);

  const goTo = (index: number) => {
    setStep(index);
    focusId(`wizard-step-${index}`);
  };

  const check = (index: number): boolean => {
    const empty = (STEPS[index] ?? []).filter(isEmpty);
    setMissing(empty);
    if (empty[0]) focusId(fieldId(empty[0]));
    return empty.length === 0;
  };

  // WHY: onSubmit plutôt que `<form action>` : React 19 réinitialise le formulaire après l'action
  // et ramènerait le <select> contrôlé sur son premier pays. Entrée passe aussi par ici.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!check(step)) return;
    if (step < STEPS.length - 1) return goTo(step + 1);
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const invalid = (name: FieldName) => missing.includes(name);
  const fieldProps = (name: FieldName) => ({
    id: fieldId(name),
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
      <p
        id={`wizard-${name}-error`}
        role={name === 'relationship' ? 'alert' : undefined}
        className="text-accent-soft text-sm"
      >
        {t('new.required')}
      </p>
    );
  const fieldsetProps = (index: number) => ({
    id: `wizard-step-${index}`,
    hidden: step !== index,
    tabIndex: -1,
    className: 'space-y-4 focus:outline-none',
  });
  const legendClass = 'font-display text-2xl font-bold';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-secondary text-secondary-foreground mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6 rounded-3xl p-6 sm:p-10"
    >
      <input type="hidden" name="entryPoint" value={entryPoint} />
      <p className="text-sm text-white/60">
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
        {RELATIONSHIPS.map((r, i) => (
          <label
            key={r}
            className={`has-[:focus-visible]:ring-accent-soft block cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:ring-2 ${
              values.relationship === r
                ? 'text-foreground border-white bg-white font-semibold'
                : 'border-white/30'
            }`}
          >
            <input
              id={i === 0 ? 'wizard-relationship-first' : undefined}
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
        <div key={errorSeq} role="alert" className="text-accent-soft space-y-1 text-sm">
          <p>{t(`errors.${state.error}`)}</p>
          {state.error === 'unauthenticated' && (
            <Link
              href={`/login?next=${encodeURIComponent(
                localizedPath(
                  `/dossier/nouveau?porte=${entryPoint === 'prepare' ? 'preparer' : 'deces'}`,
                  locale,
                ),
              )}`}
              className="font-semibold underline"
            >
              {tHeader('signIn')}
            </Link>
          )}
        </div>
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
        <button
          key={step < STEPS.length - 1 ? 'next' : 'submit'}
          type="submit"
          disabled={pending}
          className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {step < STEPS.length - 1 ? t('new.next') : t('new.submit')}
        </button>
      </div>
    </form>
  );
}

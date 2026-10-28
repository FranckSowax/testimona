'use client';

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { createProviderAction, type ProviderFormState, updateProviderAction } from '../actions';
import { PROVIDER_CATEGORIES } from '../categories';
import type { Provider } from '../schema';

const FIELD = 'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2';

type FieldMessageKey =
  | 'errors.required'
  | 'errors.tooLong'
  | 'errors.invalidCharacter'
  | 'errors.invalidPhone'
  | 'errors.exampleWithContact';

const FIELD_MESSAGES: Record<string, FieldMessageKey> = {
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
  'invalid phone': 'errors.invalidPhone',
  'example with contact': 'errors.exampleWithContact',
};

type TextName = 'name' | 'city' | 'district' | 'whatsapp' | 'priceNote';
type CheckName = 'isExample' | 'verified' | 'active';

/** Clés de `fieldErrors` qui ont un emplacement dans le formulaire. */
const RENDERED_FIELDS = [
  'categoryKey',
  'name',
  'city',
  'district',
  'whatsapp',
  'priceNote',
  'isExample',
  'verified',
  'active',
];

/**
 * Création ou modification d'un prestataire par l'équipe Testimona.
 * WHY: cocher « exemple » désactive le numéro et la vérification ; un champ désactivé n'est pas
 * envoyé, et la base refuse de toute façon un exemple contactable.
 *
 * @example
 * <ProviderForm provider={provider} verifiedOnLabel="Vérifié le 1 oct. 2026" />
 *
 * `verifiedOnLabel` est formaté côté serveur : un formatage ici donnerait un fuseau différent
 * entre le rendu serveur et le navigateur (erreur d'hydratation).
 */
export function ProviderForm({
  provider,
  verifiedOnLabel,
}: {
  provider?: Provider;
  verifiedOnLabel?: string;
}) {
  const t = useTranslations('providers');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<ProviderFormState | null, FormData>(
    provider ? updateProviderAction : createProviderAction,
    null,
  );
  const [verifiedChecked, setVerifiedChecked] = useState(provider?.verifiedAt != null);
  const [example, setExample] = useState(provider?.isExample ?? false);
  // WHY: dès que « Exemple » a été basculé, numéro et vérification repartent vides : l'équipe les
  // ressaisit explicitement, une valeur tapée avant ne doit ni réapparaître ni être renvoyée.
  const [contactReset, setContactReset] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const keepContact = !example && !contactReset;

  useEffect(() => {
    setSaved(state?.ok === true);
    if (state?.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const errorOf = (name: string) => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const key = FIELD_MESSAGES[message];
    return key ? t(key) : tErrors('validation');
  };

  const described = (name: string, hint?: string) => {
    const ids = [hint && `${uid}-${name}-hint`, errorOf(name) && `${uid}-${name}-error`];
    return ids.filter(Boolean).join(' ') || undefined;
  };

  const notes = (name: string, hint?: string): ReactNode => (
    <>
      {hint && (
        <p id={`${uid}-${name}-hint`} className="text-foreground text-sm">
          {hint}
        </p>
      )}
      {errorOf(name) && (
        <p id={`${uid}-${name}-error`} role="alert" className="text-destructive text-sm">
          {errorOf(name)}
        </p>
      )}
    </>
  );

  const textField = (
    name: TextName,
    defaultValue: string | null | undefined,
    options: { maxLength: number; hint?: string; disabled?: boolean; tel?: boolean },
  ) => (
    <div className="space-y-1">
      <label htmlFor={`${uid}-${name}`} className="text-foreground block text-sm">
        {t(`form.${name}`)}
      </label>
      <input
        key={options.disabled === undefined ? name : `${name}-${String(example)}-${contactReset}`}
        id={`${uid}-${name}`}
        name={name}
        defaultValue={defaultValue ?? ''}
        maxLength={options.maxLength}
        disabled={options.disabled}
        type={options.tel ? 'tel' : 'text'}
        autoComplete="off"
        aria-invalid={errorOf(name) ? true : undefined}
        aria-describedby={described(name, options.hint)}
        className={FIELD}
      />
      {notes(name, options.hint)}
    </div>
  );

  const checkbox = (
    name: CheckName,
    defaultChecked: boolean,
    options: {
      hint?: string;
      disabled?: boolean;
      controlled?: boolean;
      onChange?: (checked: boolean) => void;
    } = {},
  ) => (
    <div className="space-y-1">
      <label className="text-foreground flex items-center gap-2 text-sm">
        <input
          key={options.disabled === undefined ? name : `${name}-${String(example)}-${contactReset}`}
          type="checkbox"
          name={name}
          {...(options.controlled ? { checked: defaultChecked } : { defaultChecked })}
          disabled={options.disabled}
          onChange={(e) => options.onChange?.(e.currentTarget.checked)}
          aria-invalid={errorOf(name) ? true : undefined}
          aria-describedby={described(name, options.hint)}
        />
        {t(`form.${name}`)}
      </label>
      {notes(name, options.hint)}
    </div>
  );

  // WHY: une erreur de champ sans emplacement (providerId, clé inconnue) doit rester visible.
  const hasVisibleFieldError = Object.keys(state?.fieldErrors ?? {}).some((k) =>
    RENDERED_FIELDS.includes(k),
  );
  const globalError =
    state?.error && !hasVisibleFieldError
      ? tErrors(state.fieldErrors ? 'validation' : state.error)
      : null;

  return (
    <form
      ref={formRef}
      aria-label={provider ? t('admin.edit') : t('admin.new')}
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      noValidate
      className="grid max-w-2xl gap-4"
    >
      {provider && <input type="hidden" name="providerId" value={provider.id} />}
      <div className="space-y-1">
        <label htmlFor={`${uid}-categoryKey`} className="text-foreground block text-sm">
          {t('form.category')}
        </label>
        <select
          id={`${uid}-categoryKey`}
          name="categoryKey"
          defaultValue={provider?.categoryKey ?? PROVIDER_CATEGORIES[0]}
          aria-invalid={errorOf('categoryKey') ? true : undefined}
          aria-describedby={described('categoryKey')}
          className={FIELD}
        >
          {PROVIDER_CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {t(`category.${key}`)}
            </option>
          ))}
        </select>
        {notes('categoryKey')}
      </div>
      {textField('name', provider?.name, { maxLength: 120 })}
      {textField('city', provider?.city ?? 'Libreville', { maxLength: 120 })}
      {textField('district', provider?.district, { maxLength: 120 })}
      {checkbox('isExample', example, {
        hint: t('form.isExampleHint'),
        controlled: true,
        onChange: (value) => {
          setExample(value);
          setVerifiedChecked(false);
          setContactReset(true);
        },
      })}
      {textField('whatsapp', keepContact ? provider?.whatsapp : '', {
        maxLength: 24,
        hint: t('form.whatsappHint'),
        disabled: example,
        tel: true,
      })}
      {textField('priceNote', provider?.priceNote, {
        maxLength: 200,
        hint: t('form.priceNoteHint'),
      })}
      {checkbox('verified', keepContact && provider?.verifiedAt != null, {
        disabled: example,
        onChange: setVerifiedChecked,
        // WHY: la date n'a de sens que si la vérification d'origine est conservée et cochée.
        hint: keepContact && verifiedChecked ? verifiedOnLabel : undefined,
      })}
      {checkbox('active', provider?.active ?? true)}
      {globalError && (
        <p role="alert" className="text-destructive text-sm">
          {globalError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {pending ? t('form.saving') : t('form.save')}
        </button>
        {saved && (
          <p role="status" className="text-foreground text-sm">
            {t('form.saved')}
          </p>
        )}
      </div>
    </form>
  );
}

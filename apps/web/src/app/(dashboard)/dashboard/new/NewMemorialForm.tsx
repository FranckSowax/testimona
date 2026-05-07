'use client';

import { useActionState } from 'react';
import { createMemorialAction, type NewMemorialActionState } from './actions';

export function NewMemorialForm() {
  const [state, formAction, isPending] = useActionState<NewMemorialActionState | null, FormData>(
    createMemorialAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="firstname"
          name="firstname"
          label="Prénom"
          required
          maxLength={80}
          error={state?.fieldErrors?.firstname}
        />
        <Field
          id="lastname"
          name="lastname"
          label="Nom"
          required
          maxLength={80}
          error={state?.fieldErrors?.lastname}
        />
      </div>

      <Field
        id="nickname"
        name="nickname"
        label="Surnom (facultatif)"
        maxLength={80}
        error={state?.fieldErrors?.nickname}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="birthDate"
          name="birthDate"
          type="date"
          label="Date de naissance"
          error={state?.fieldErrors?.birthDate}
        />
        <Field
          id="deathDate"
          name="deathDate"
          type="date"
          label="Date de décès"
          error={state?.fieldErrors?.deathDate}
        />
      </div>

      <div>
        <label htmlFor="language" className="block text-sm font-medium">
          Langue
        </label>
        <select
          id="language"
          name="language"
          defaultValue="fr"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description (facultatif)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {state?.fieldErrors?.description && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublic" defaultChecked />
        Rendre le mémorial public
      </label>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Création...' : 'Créer le mémorial'}
      </button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = 'text',
  required,
  maxLength,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

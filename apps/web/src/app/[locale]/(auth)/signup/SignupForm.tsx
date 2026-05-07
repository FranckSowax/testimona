'use client';

import { useActionState } from 'react';
import { signupAction, type SignupActionState } from './actions';

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<SignupActionState | null, FormData>(
    signupAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium">
          Pseudonyme
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          autoComplete="nickname"
          maxLength={50}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {state?.fieldErrors?.nickname && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.nickname}</p>
        )}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Mot de passe (8 caractères minimum)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {state?.fieldErrors?.password && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.password}</p>
        )}
      </div>
      {state?.error && state.error !== 'Validation' && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Création...' : 'Créer mon compte'}
      </button>
    </form>
  );
}

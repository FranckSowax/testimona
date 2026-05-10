'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { forgotPasswordAction, type ForgotPasswordState } from './actions';

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<ForgotPasswordState | null, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Un lien de réinitialisation vient d&apos;être envoyé. Vérifie ta boîte de réception.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField label="Email" required error={state?.fieldErrors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </FormField>
      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={isPending} fullWidth>
        {isPending ? 'Envoi…' : 'Envoyer le lien'}
      </Button>
    </form>
  );
}

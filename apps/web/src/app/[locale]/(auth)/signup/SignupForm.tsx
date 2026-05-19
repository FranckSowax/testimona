'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { signupAction, type SignupActionState } from './actions';

export function SignupForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<SignupActionState | null, FormData>(
    signupAction,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      // welcome flag is forwarded by LoginForm to /dashboard?welcome=1 on
      // first sign-in, where WelcomeOverlayTrigger picks it up.
      router.replace('/login?signup=ok&welcome=1');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <FormField label="Pseudonyme" required error={state?.fieldErrors?.nickname}>
        <Input name="nickname" type="text" autoComplete="nickname" maxLength={50} />
      </FormField>
      <FormField label="Email" required error={state?.fieldErrors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
        />
      </FormField>
      <FormField
        label="Mot de passe"
        required
        hint="8 caractères minimum"
        error={state?.fieldErrors?.password}
      >
        <Input name="password" type="password" autoComplete="new-password" minLength={8} />
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
        {isPending ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  );
}

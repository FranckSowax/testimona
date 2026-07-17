'use client';

import { useActionState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { signupAction, type SignupActionState } from './actions';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState<SignupActionState | null, FormData>(
    signupAction,
    null,
  );

  useEffect(() => {
    // Only auto-redirect when the account is already usable (email
    // confirmation disabled). When confirmation is required (G2) we keep the
    // user on the page and show the "check your inbox" panel below.
    if (state?.success && !state.confirmEmail) {
      // Forward the caller's `next` intent (e.g. /dashboard/new when the user
      // clicked "Create memorial" while logged out) so login lands them on the
      // page they actually wanted instead of dropping them on /dashboard.
      // welcome=1 is forwarded by LoginForm to <next>?welcome=1 on first
      // sign-in, where WelcomeOverlayTrigger picks it up.
      const next = searchParams.get('next');
      const params = new URLSearchParams({ signup: 'ok', welcome: '1' });
      if (next && next.startsWith('/')) params.set('next', next);
      router.replace(`/login?${params.toString()}`);
      router.refresh();
    }
  }, [state, router, searchParams]);

  if (state?.success && state.confirmEmail) {
    return (
      <div
        role="status"
        className="mt-8 space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-center"
      >
        <p className="font-display text-lg font-bold text-emerald-700">
          Vérifie ta boîte mail
        </p>
        <p className="text-sm text-emerald-800">
          Nous t&apos;avons envoyé un e-mail de confirmation. Clique sur le lien
          qu&apos;il contient pour activer ton compte, puis connecte-toi.
        </p>
        <a
          href={
            searchParams.get('next')?.startsWith('/')
              ? `/login?next=${encodeURIComponent(searchParams.get('next')!)}`
              : '/login'
          }
          className="press-scale inline-block rounded-md border-2 border-emerald-600 px-4 py-2 font-display text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
        >
          Aller à la connexion
        </a>
      </div>
    );
  }

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

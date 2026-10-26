'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { localizedPath, safeNextPath } from '@/lib/auth/redirect-target';
import { signupAction, type SignupActionState } from './actions';

export function SignupForm() {
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [state, formAction, isPending] = useActionState<SignupActionState | null, FormData>(
    async (prev, formData) => {
      const result = await signupAction(prev, formData);
      // Only auto-redirect when the account is already usable (email
      // confirmation disabled). When confirmation is required (G2) we keep the
      // user on the page and show the "check your inbox" panel below.
      if (result.success && !result.confirmEmail) {
        // Forward the caller's `next` intent (e.g. /dashboard/new when the user
        // clicked "Create memorial" while logged out) so login lands them on the
        // page they actually wanted instead of dropping them on /dashboard.
        // welcome=1 is forwarded by LoginForm to <next>?welcome=1 on first
        // sign-in, where WelcomeOverlayTrigger picks it up.
        const next = safeNextPath(searchParams.get('next'), '');
        const params = new URLSearchParams({ signup: 'ok', welcome: '1' });
        if (next) params.set('next', next);
        // Full document navigation for the same reason as LoginForm: a soft
        // navigation would leave the intercepting `@modal/(.)signup` slot
        // mounted over the login screen with a session it was not rendered
        // with, which crashes the client router.
        window.location.replace(localizedPath(`/login?${params.toString()}`, locale));
      }
      return result;
    },
    null,
  );

  const redirecting = !!state?.success && !state.confirmEmail;

  if (state?.success && state.confirmEmail) {
    return (
      <div
        role="status"
        className="mt-8 space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-center"
      >
        <p className="font-display text-lg font-bold text-emerald-700">Vérifie ta boîte mail</p>
        <p className="text-sm text-emerald-800">
          Nous t&apos;avons envoyé un e-mail de confirmation. Clique sur le lien qu&apos;il contient
          pour activer ton compte, puis connecte-toi.
        </p>
        <a
          href={localizedPath(
            (() => {
              const next = safeNextPath(searchParams.get('next'), '');
              return next ? `/login?next=${encodeURIComponent(next)}` : '/login';
            })(),
            locale,
          )}
          className="press-scale font-display inline-block rounded-md border-2 border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
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
        <Input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" />
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
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}
      {/* `redirecting` keeps the spinner up while the browser loads /login. */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending || redirecting}
        fullWidth
      >
        {isPending || redirecting ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  );
}

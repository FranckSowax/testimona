'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { loginSuccessTarget } from '@/lib/auth/redirect-target';
import { loginAction, loginWithGoogleAction, type LoginActionState } from './actions';

export function LoginForm() {
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [state, formAction, isPending] = useActionState<LoginActionState | null, FormData>(
    async (prev, formData) => {
      const result = await loginAction(prev, formData);
      if (result.ok) {
        const target = loginSuccessTarget(
          { next: searchParams.get('next'), welcome: searchParams.get('welcome') },
          locale,
        );
        // A full document navigation, on purpose — and the reason the redirect
        // lives here rather than in a `useEffect`.
        //
        // A client-side `router.replace()` leaves the intercepting
        // `@modal/(.)login` slot mounted on top of the destination, and the
        // `router.refresh()` that had to follow it re-rendered that slot with a
        // session it was not created with. That mismatch is what surfaced as
        // "Application error: a client-side exception has occurred" on every
        // fresh sign-in, and why reloading by hand made it go away. Reloading is
        // now what we do, once, automatically: the modal slot is torn down, and
        // the header, credit badge and dashboard are all rendered server-side
        // with the new session cookie.
        //
        // Running it in the action continuation rather than an effect also means
        // it still fires if React unmounts this form while applying the Server
        // Action's re-render.
        //
        // `replace`, not `assign`: Back should return to whatever page the user
        // opened the login modal from, not to /login — which, now that they are
        // signed in, would only bounce them forward again.
        window.location.replace(target);
      }
      return result;
    },
    null,
  );

  return (
    <div className="mt-8 space-y-5">
      <form action={formAction} className="space-y-4">
        <FormField label="Email" required error={state?.fieldErrors?.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" />
        </FormField>
        <FormField label="Mot de passe" required error={state?.fieldErrors?.password}>
          <Input name="password" type="password" autoComplete="current-password" minLength={8} />
        </FormField>
        {state?.error && state.error !== 'Validation' && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {state.error}
          </p>
        )}
        {/* `state.ok` keeps the spinner up while the browser loads the next
            document, instead of flashing back to the idle label. */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isPending || !!state?.ok}
          fullWidth
        >
          {isPending || state?.ok ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="text-muted-foreground bg-white px-3">ou</span>
        </div>
      </div>
      <form action={loginWithGoogleAction}>
        <Button type="submit" variant="secondary" styleVariant="outline" size="lg" fullWidth>
          Continuer avec Google
        </Button>
      </form>
    </div>
  );
}

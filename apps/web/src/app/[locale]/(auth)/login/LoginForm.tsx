'use client';

import { useActionState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { loginAction, loginWithGoogleAction, type LoginActionState } from './actions';

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<LoginActionState | null, FormData>(
    loginAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const next = searchParams.get('next');
      const welcome = searchParams.get('welcome') === '1';
      let target = next && next.startsWith('/') ? next : '/dashboard';
      if (welcome) {
        target = target.includes('?') ? `${target}&welcome=1` : `${target}?welcome=1`;
      }
      router.replace(target);
      router.refresh();
    }
  }, [state, router, searchParams]);

  return (
    <div className="mt-8 space-y-5">
      <form action={formAction} className="space-y-4">
        <FormField label="Email" required error={state?.fieldErrors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
        </FormField>
        <FormField label="Mot de passe" required error={state?.fieldErrors?.password}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
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
          {isPending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white px-3 text-muted-foreground">ou</span>
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

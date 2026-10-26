'use client';

import { useActionState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import {
  loginAction,
  loginWithGoogleAction,
  type LoginActionState,
} from '@/app/[locale]/(auth)/login/actions';
import { OverlayModal } from './OverlayModal';

interface LoginOverlayProps {
  open: boolean;
  onClose: () => void;
  next?: string;
}

export function LoginOverlay({ open, onClose, next }: LoginOverlayProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<LoginActionState | null, FormData>(
    loginAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const target = next && next.startsWith('/') ? next : '/dashboard';
      router.replace(target);
      router.refresh();
    }
  }, [state, router, next]);

  return (
    <OverlayModal open={open} onClose={onClose} ariaLabel="Logging in">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <h2 className="relative inline-block">
            <span
              className="inline-block -rotate-1 text-5xl text-[var(--color-primary-soft)] sm:text-6xl"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              Logging in
            </span>
            <span
              aria-hidden="true"
              className="absolute -left-6 top-2 text-xl text-[var(--color-primary-soft)]"
            >
              ♡
            </span>
            <span aria-hidden="true" className="text-accent absolute -right-6 top-2 text-xl">
              ♥
            </span>
          </h2>
          <p className="font-display text-base text-white/90">with an existing account</p>
          <div className="space-y-2">
            <button
              type="button"
              className="press-scale font-display flex w-full items-center justify-center gap-2 rounded-md bg-[#1877F2] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Continue with Facebook
            </button>
            <form action={loginWithGoogleAction}>
              <button
                type="submit"
                className="press-scale font-display flex w-full items-center justify-center gap-2 rounded-md bg-[#EA4335] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Continue with Google
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4 text-center">
          <h2 className="relative inline-block">
            <span
              className="inline-block -rotate-1 text-5xl text-[var(--color-primary-soft)] sm:text-6xl"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              Logging in
            </span>
          </h2>
          <p className="font-display text-base text-white/90">with your email</p>
        </div>

        <form action={formAction} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Enter your email*"
            required
            autoComplete="email"
            className="text-foreground placeholder:text-muted-foreground focus:border-primary block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.email && (
            <p className="text-accent text-xs">{state.fieldErrors.email}</p>
          )}
          <input
            name="password"
            type="password"
            placeholder="Enter your password*"
            required
            minLength={8}
            autoComplete="current-password"
            className="text-foreground placeholder:text-muted-foreground focus:border-primary block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base focus:outline-none sm:text-sm"
          />
          {state?.fieldErrors?.password && (
            <p className="text-accent text-xs">{state.fieldErrors.password}</p>
          )}

          <p className="text-center">
            <a
              href="#"
              className="font-display text-xs font-bold uppercase tracking-wide text-white/80 hover:text-white"
            >
              Did you forget your password?
            </a>
          </p>

          {state?.error && state.error !== 'Validation' && (
            <p role="alert" className="bg-accent/20 rounded-md px-3 py-2 text-sm text-white">
              {state.error}
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined
              type="button"
              variant="thankyou-gray"
              size="lg"
              onClick={onClose}
              className="!border-white/40 !text-white hover:!bg-white/10"
            >
              Cancel
            </ButtonOutlined>
            <ButtonOutlined type="submit" variant="popup-rose" size="lg" loading={isPending}>
              {isPending ? 'Logging in…' : 'Log in'}
            </ButtonOutlined>
          </div>
        </form>

        <p className="text-center text-xs text-white/70">
          By logging in, you agree to our{' '}
          <Link href="/legal/terms" className="underline">
            Terms of Use
          </Link>{' '}
          and acknowledge that you read our{' '}
          <Link href="/legal/privacy" className="underline">
            Privacy Policy
          </Link>
          .<span className="mx-3 text-white/40">|</span>
          Need an account?{' '}
          <Link href="/signup" className="font-display text-accent font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </OverlayModal>
  );
}

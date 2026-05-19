'use client';

import Image from 'next/image';
import { useActionState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import {
  signupAction,
  type SignupActionState,
} from '@/app/[locale]/(auth)/signup/actions';
import { OverlayModal } from './OverlayModal';

interface SignupOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SignupOverlay({ open, onClose }: SignupOverlayProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<SignupActionState | null, FormData>(
    signupAction,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      router.replace('/login?signup=ok');
      router.refresh();
    }
  }, [state, router]);

  return (
    <OverlayModal open={open} onClose={onClose} ariaLabel="Sign up">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[2fr_3fr]">
        <aside className="space-y-6 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <Image
              src="/images/dove.svg"
              alt=""
              width={64}
              height={64}
              className="h-12 w-auto opacity-90"
            />
          </div>
          <p className="font-body text-base leading-relaxed text-white/90 sm:text-lg">
            Testimona is a beautiful community dedicated to sharing joyful souvenirs of our
            loved ones in heaven so they live forever in our hearts. We are writing their life
            stories to remember, share with our children and pass to future generations. We
            look forward to learning more about your loved one.
          </p>
          <p className="text-xs text-white/60">
            By signing up, you agree to our{' '}
            <a href="/legal/terms" className="underline">
              Terms of Use
            </a>
            , the{' '}
            <a href="/legal/privacy" className="underline">
              Cookies Policy
            </a>
            , and acknowledge that you read our{' '}
            <a href="/legal/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
          <p className="text-sm text-white/80">
            You already have an account?{' '}
            <a href="/login" className="font-display font-bold text-accent hover:underline">
              Log in
            </a>
          </p>
        </aside>

        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="relative inline-block">
              <span
                className="-rotate-1 inline-block text-5xl text-[var(--color-primary-soft)] sm:text-6xl"
                style={{ fontFamily: 'var(--font-cursive)' }}
              >
                Sign up
              </span>
            </h2>
            <p className="font-display text-base text-white/90">with an existing account</p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                className="press-scale flex w-full items-center justify-center gap-2 rounded-md bg-[#1877F2] px-5 py-3 font-display text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Continue with Facebook
              </button>
              <button
                type="button"
                className="press-scale flex w-full items-center justify-center gap-2 rounded-md bg-[#EA4335] px-5 py-3 font-display text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Continue with Google
              </button>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="relative inline-block">
              <span
                className="-rotate-1 inline-block text-5xl text-[var(--color-primary-soft)] sm:text-6xl"
                style={{ fontFamily: 'var(--font-cursive)' }}
              >
                Sign up
              </span>
            </h2>
            <p className="font-display text-base text-white/90">with your email</p>
          </div>

          <form action={formAction} className="space-y-3">
            <input
              name="firstname"
              type="text"
              placeholder="Firstname*"
              autoComplete="given-name"
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
            <input
              name="nickname"
              type="text"
              placeholder="Username*"
              required
              autoComplete="nickname"
              maxLength={50}
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
            {state?.fieldErrors?.nickname && (
              <p className="text-xs text-accent">{state.fieldErrors.nickname}</p>
            )}
            <input
              name="email"
              type="email"
              placeholder="Enter your email*"
              required
              autoComplete="email"
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
            {state?.fieldErrors?.email && (
              <p className="text-xs text-accent">{state.fieldErrors.email}</p>
            )}
            <input
              name="password"
              type="password"
              placeholder="Enter your password*"
              required
              minLength={8}
              autoComplete="new-password"
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
            {state?.fieldErrors?.password && (
              <p className="text-xs text-accent">{state.fieldErrors.password}</p>
            )}
            <input
              name="password_confirm"
              type="password"
              placeholder="Repeat password"
              minLength={8}
              autoComplete="new-password"
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
            <select
              name="favorite_color"
              defaultValue=""
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            >
              <option value="" disabled>
                What is your favorite color?
              </option>
              <option value="pink">Pink</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="other">Other</option>
            </select>
            <select
              name="security_question"
              defaultValue=""
              className="block w-full rounded-md border border-white/20 bg-white/95 px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            >
              <option value="" disabled>
                Choose your security question 2
              </option>
              <option>Mother&apos;s maiden name</option>
              <option>City of birth</option>
              <option>First pet name</option>
            </select>

            {state?.error && state.error !== 'Validation' && (
              <p role="alert" className="rounded-md bg-accent/20 px-3 py-2 text-sm text-white">
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
              <ButtonOutlined
                type="submit"
                variant="popup-rose"
                size="lg"
                loading={isPending}
              >
                {isPending ? 'Creating…' : 'Sign up'}
              </ButtonOutlined>
            </div>
          </form>
        </div>
      </div>
    </OverlayModal>
  );
}

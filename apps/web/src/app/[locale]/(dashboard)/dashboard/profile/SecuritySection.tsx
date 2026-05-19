'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useToast } from '@/components/Toast';
import {
  changePasswordAction,
  sendPasswordResetAction,
  type ChangePasswordState,
} from './actions';

interface Labels {
  formTitle: string;
  formSubtitle: string;
  newPassword: string;
  confirmPassword: string;
  save: string;
  saving: string;
  saved: string;
  resetTitle: string;
  resetBody: string;
  resetCta: string;
  resetSent: string;
}

export function SecuritySection({ labels }: { labels: Labels }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    ChangePasswordState | null,
    FormData
  >(changePasswordAction, null);
  const [resetPending, startResetTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      toast.success(labels.saved);
      formRef.current?.reset();
    } else if (state?.error && state.error !== 'Validation') {
      toast.error(state.error);
    }
  }, [state, toast, labels.saved]);

  function handleResetEmail() {
    startResetTransition(async () => {
      const res = await sendPasswordResetAction();
      if (res.error) toast.error(res.error);
      else toast.success(labels.resetSent);
    });
  }

  return (
    <div className="space-y-8">
      {/* Change password directly */}
      <form
        ref={formRef}
        action={formAction}
        className="space-y-4 rounded-lg border border-border bg-white p-5"
      >
        <header>
          <h3 className="font-display text-base font-bold text-foreground">
            {labels.formTitle}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{labels.formSubtitle}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block font-display text-sm font-medium text-foreground">
              {labels.newPassword}
            </span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
            />
            {state?.fieldErrors?.newPassword && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.newPassword}
              </p>
            )}
          </label>
          <label className="block">
            <span className="block font-display text-sm font-medium text-foreground">
              {labels.confirmPassword}
            </span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
            />
            {state?.fieldErrors?.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.confirmPassword}
              </p>
            )}
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? labels.saving : labels.save}
          </button>
        </div>
      </form>

      {/* Backup: trigger reset-by-email link */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="font-display text-base font-bold text-foreground">
          {labels.resetTitle}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.resetBody}</p>
        <button
          type="button"
          onClick={handleResetEmail}
          disabled={resetPending}
          className="mt-4 rounded-md border-2 border-foreground/80 px-4 py-2 font-display text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {labels.resetCta}
        </button>
      </section>
    </div>
  );
}

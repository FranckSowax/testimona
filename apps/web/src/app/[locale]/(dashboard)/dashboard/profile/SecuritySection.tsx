'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useToast } from '@/components/Toast';
import { changePasswordAction, sendPasswordResetAction, type ChangePasswordState } from './actions';

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
  const [state, formAction, isPending] = useActionState<ChangePasswordState | null, FormData>(
    changePasswordAction,
    null,
  );
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
        className="border-border space-y-4 rounded-lg border bg-white p-5"
      >
        <header>
          <h3 className="font-display text-foreground text-base font-bold">{labels.formTitle}</h3>
          <p className="text-muted-foreground mt-1 text-xs">{labels.formSubtitle}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-display text-foreground block text-sm font-medium">
              {labels.newPassword}
            </span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
            />
            {state?.fieldErrors?.newPassword && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.newPassword}</p>
            )}
          </label>
          <label className="block">
            <span className="font-display text-foreground block text-sm font-medium">
              {labels.confirmPassword}
            </span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
            />
            {state?.fieldErrors?.confirmPassword && (
              <p className="text-destructive mt-1 text-xs">{state.fieldErrors.confirmPassword}</p>
            )}
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary font-display text-primary-foreground rounded-md px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? labels.saving : labels.save}
          </button>
        </div>
      </form>

      {/* Backup: trigger reset-by-email link */}
      <section className="border-border bg-surface rounded-lg border p-5">
        <h3 className="font-display text-foreground text-base font-bold">{labels.resetTitle}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{labels.resetBody}</p>
        <button
          type="button"
          onClick={handleResetEmail}
          disabled={resetPending}
          className="border-foreground/80 font-display text-foreground hover:border-primary hover:text-primary mt-4 rounded-md border-2 px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {labels.resetCta}
        </button>
      </section>
    </div>
  );
}

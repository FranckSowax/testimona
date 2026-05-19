'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import {
  requestPayoutSetupAction,
  type PayoutContactState,
} from './actions';

interface Labels {
  intro: string;
  methodLabel: string;
  methodHint: string;
  methodPaypal: string;
  methodBank: string;
  methodOther: string;
  noteLabel: string;
  notePlaceholder: string;
  submit: string;
  submitting: string;
  sent: string;
}

export function PayoutSection({ labels }: { labels: Labels }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    PayoutContactState | null,
    FormData
  >(requestPayoutSetupAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(labels.sent);
      formRef.current?.reset();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, toast, labels.sent]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5 rounded-lg border border-border bg-white p-5"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{labels.intro}</p>

      <label className="block">
        <span className="block font-display text-sm font-medium text-foreground">
          {labels.methodLabel}
        </span>
        <select
          name="method"
          required
          defaultValue=""
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            —
          </option>
          <option value="paypal">{labels.methodPaypal}</option>
          <option value="bank">{labels.methodBank}</option>
          <option value="other">{labels.methodOther}</option>
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          {labels.methodHint}
        </span>
      </label>

      <label className="block">
        <span className="block font-display text-sm font-medium text-foreground">
          {labels.noteLabel}
        </span>
        <textarea
          name="note"
          rows={4}
          placeholder={labels.notePlaceholder}
          className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}

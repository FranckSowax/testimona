'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { requestPayoutSetupAction, type PayoutContactState } from './actions';

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
  const [state, formAction, isPending] = useActionState<PayoutContactState | null, FormData>(
    requestPayoutSetupAction,
    null,
  );

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
      className="border-border space-y-5 rounded-lg border bg-white p-5"
    >
      <p className="text-muted-foreground text-sm leading-relaxed">{labels.intro}</p>

      <label className="block">
        <span className="font-display text-foreground block text-sm font-medium">
          {labels.methodLabel}
        </span>
        <select
          name="method"
          required
          defaultValue=""
          className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
        >
          <option value="" disabled>
            —
          </option>
          <option value="paypal">{labels.methodPaypal}</option>
          <option value="bank">{labels.methodBank}</option>
          <option value="other">{labels.methodOther}</option>
        </select>
        <span className="text-muted-foreground mt-1 block text-xs">{labels.methodHint}</span>
      </label>

      <label className="block">
        <span className="font-display text-foreground block text-sm font-medium">
          {labels.noteLabel}
        </span>
        <textarea
          name="note"
          rows={4}
          placeholder={labels.notePlaceholder}
          className="border-border text-foreground focus:border-primary mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-base focus:outline-none"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary font-display text-primary-foreground rounded-md px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}

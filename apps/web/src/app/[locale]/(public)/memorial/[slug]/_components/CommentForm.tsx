'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { submitCommentAction, type CommentActionState } from '../actions';

export function CommentForm({
  testimonialId,
  slug,
}: {
  testimonialId: string;
  slug: string;
}) {
  const t = useTranslations('testimonial');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<CommentActionState | null, FormData>(
    submitCommentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="testimonialId" value={testimonialId} />
      <input type="hidden" name="slug" value={slug} />
      <textarea
        name="message"
        required
        rows={2}
        maxLength={2000}
        placeholder={t('writeComment')}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {state?.fieldErrors?.message && (
        <p className="text-xs text-destructive">{state.fieldErrors.message}</p>
      )}
      {state?.error && state.error !== 'Validation' && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t('submittingComment') : t('submitComment')}
        </button>
      </div>
    </form>
  );
}

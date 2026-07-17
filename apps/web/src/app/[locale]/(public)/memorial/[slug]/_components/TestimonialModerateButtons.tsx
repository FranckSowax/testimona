'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  moderateTestimonialAction,
  type TestimonialActionState,
} from '../actions';

/**
 * Owner-only approve/reject inline controls for a pending testimonial.
 * Lives in its own file so the server-rendered TestimonialsSection can
 * import it as a regular client component (avoids the static-property
 * hazard across the Server → Client boundary).
 */
export function TestimonialModerateButtons({
  testimonialId,
  slug,
}: {
  testimonialId: string;
  slug: string;
}) {
  const t = useTranslations('memorial.moderate');
  const [state, formAction, isPending] = useActionState<
    TestimonialActionState | null,
    FormData
  >(moderateTestimonialAction, null);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={testimonialId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            disabled={isPending}
            className="press-scale flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t('approve')}
          </button>
        </form>
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={testimonialId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="decision" value="rejected" />
          <button
            type="submit"
            disabled={isPending}
            className="press-scale flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-white px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            {t('reject')}
          </button>
        </form>
      </div>
      {state?.error && (
        <p role="alert" className="text-[11px] text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  deleteFuneralEventAction,
  type FuneralEventActionState,
} from '../_actions/funeral';

/**
 * Owner-only delete control for a funeral event. Standalone client
 * component (not a static property on FuneralSection) so the server
 * component can import it directly.
 */
export function FuneralEventDeleteButton({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const t = useTranslations('memorial.funeralSection');
  const [state, formAction, isPending] = useActionState<
    FuneralEventActionState | null,
    FormData
  >(deleteFuneralEventAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={isPending}
        aria-label={t('deleteEventAria')}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
        {t('deleteEvent')}
      </button>
      {state?.error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

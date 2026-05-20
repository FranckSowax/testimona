'use client';

import { useActionState } from 'react';
import {
  moderatePhotoAction,
  type PhotoActionState,
} from '../photo-actions';

/**
 * Owner-only approve / reject inline controls for a pending Photo.
 * Rejecting deletes both the row and the underlying storage object.
 */
export function PhotoModerateButtons({
  photoId,
  slug,
}: {
  photoId: string;
  slug: string;
}) {
  const [state, formAction, isPending] = useActionState<
    PhotoActionState | null,
    FormData
  >(moderatePhotoAction, null);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={photoId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            disabled={isPending}
            className="press-scale flex w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Publier
          </button>
        </form>
        <form action={formAction} className="flex-1">
          <input type="hidden" name="id" value={photoId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="decision" value="rejected" />
          <button
            type="submit"
            disabled={isPending}
            className="press-scale flex w-full items-center justify-center gap-1 rounded-md border border-destructive/40 bg-white px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            Refuser
          </button>
        </form>
      </div>
      {state?.error && (
        <p role="alert" className="text-[10px] text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}

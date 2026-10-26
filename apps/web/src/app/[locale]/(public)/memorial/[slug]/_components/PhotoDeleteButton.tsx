'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteMemorialPhotoAction } from '../photo-actions';

/**
 * Owner-only "remove this photo" control shown under each approved photo —
 * lets the family clean up pictures that are outdated or no longer relevant,
 * without waiting on a visitor report.
 */
export function PhotoDeleteButton({ photoId, slug }: { photoId: string; slug: string }) {
  const t = useTranslations('memorial.photoDelete');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(t('confirm'))) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMemorialPhotoAction(photoId, slug);
      if (res.error) {
        setError(t('error'));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        title={t('deleteTitle')}
        className="press-scale font-display text-muted-foreground hover:text-destructive flex w-full items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
      >
        <svg
          width="11"
          height="11"
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
        {pending ? '…' : t('delete')}
      </button>
      {error && <p className="text-destructive px-2 pb-1 text-center text-[10px]">{error}</p>}
    </div>
  );
}

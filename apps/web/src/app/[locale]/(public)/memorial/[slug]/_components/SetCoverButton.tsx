'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setCoverPhotoAction, type PhotoActionState } from '../photo-actions';

/**
 * Owner-only "set as cover" control shown under each approved photo. The chosen
 * photo becomes both the banner background and the round portrait
 * (Memorial.coverPhotoId). Filled star = current cover.
 */
export function SetCoverButton({
  memorialId,
  photoId,
  slug,
  isCover,
}: {
  memorialId: string;
  photoId: string;
  slug: string;
  isCover: boolean;
}) {
  const t = useTranslations('memorial.setCover');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    PhotoActionState | null,
    FormData
  >(setCoverPhotoAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (isCover) {
    return (
      <div className="flex items-center justify-center gap-1 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-accent">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
        </svg>
        {t('cover')}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="memorialId" value={memorialId} />
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={isPending}
        title={t('setAsCover')}
        className="press-scale flex w-full items-center justify-center gap-1 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-accent disabled:opacity-50"
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
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
        </svg>
        {isPending ? '…' : t('cover')}
      </button>
      {state?.error && (
        <p className="px-2 pb-1 text-center text-[10px] text-destructive">{state.error}</p>
      )}
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { PhotoStoryViewer, type StoryPhoto } from './PhotoStoryViewer';
import { MemorialShareDialog } from './MemorialShareDialog';
import { toggleFavoriteAction } from '../_actions/favorite';

interface Labels {
  play: string;
  edit: string;
  like: string;
  liked: string;
  share: string;
  writeTestimonial: string;
  signinToWrite: string;
  story: {
    aria: string;
    close: string;
    prev: string;
    next: string;
    play: string;
    pause: string;
    filterNone: string;
    filterBw: string;
    filterSepia: string;
    kenBurns: string;
    vignette: string;
    bokeh: string;
    swipe: string;
    fade: string;
    musicOn: string;
    musicOff: string;
    empty: string;
    speed: string;
    speedSlow: string;
    speedMedium: string;
    speedFast: string;
  };
  shareDialog: {
    aria: string;
    heading: string;
    copy: string;
    copied: string;
    close: string;
    nativeShare: string;
    facebook: string;
    twitter: string;
    whatsapp: string;
    linkedin: string;
    email: string;
  };
}

interface Props {
  slug: string;
  memorialId: string;
  fullName: string;
  shareUrl: string;
  photos: StoryPhoto[];
  musicUrl?: string | null;
  isOwner: boolean;
  isLoggedIn: boolean;
  isFavoriteInitial: boolean;
  /** Public hearts count shown as a badge on the favorite button. */
  favoritesCountInitial: number;
  labels: Labels;
}

/**
 * Cover icon strip (right side of the memorial banner). Each icon either
 * dispatches a CustomEvent that an existing modal shell on the page picks
 * up, or opens its own client-side overlay (story + share).
 *
 * Email icon removed per user feedback — email sharing is still available
 * in the share drawer's grid.
 */
export function MemorialCoverSidebar({
  slug,
  memorialId,
  fullName,
  shareUrl,
  photos,
  musicUrl,
  isOwner,
  isLoggedIn,
  isFavoriteInitial,
  favoritesCountInitial,
  labels,
}: Props) {
  const t = useTranslations('memorial.coverSidebar');
  const router = useRouter();
  const [storyOpen, setStoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [favCount, setFavCount] = useState(favoritesCountInitial);
  const [, startFavTransition] = useTransition();

  function toggleFav() {
    if (!isLoggedIn) {
      router.push(`/login?next=/memorial/${slug}`);
      return;
    }
    const optimistic = !isFavorite;
    setIsFavorite(optimistic); // optimistic
    setFavCount((c) => Math.max(0, c + (optimistic ? 1 : -1)));
    startFavTransition(async () => {
      const res = await toggleFavoriteAction(memorialId, slug);
      if (res.needsAuth) {
        router.push(`/login?next=/memorial/${slug}`);
        return;
      }
      if (typeof res.favorite === 'boolean') {
        setIsFavorite(res.favorite);
      } else {
        // revert on error
        setIsFavorite(!optimistic);
        setFavCount((c) => Math.max(0, c + (optimistic ? -1 : 1)));
      }
    });
  }

  function openTestimonial() {
    if (!isLoggedIn) {
      router.push(`/login?next=/memorial/${slug}`);
      return;
    }
    window.dispatchEvent(new CustomEvent('testimona:open-testimonial'));
  }

  function openEdit() {
    window.dispatchEvent(new CustomEvent('testimona:open-memorial-edit'));
  }

  function openAnimate() {
    window.dispatchEvent(new CustomEvent('testimona:open-animate'));
  }

  return (
    <>
      {/* Play diaporama */}
      <ButtonIcon
        label={labels.play}
        tone="default"
        size="sm"
        onClick={() => setStoryOpen(true)}
        className="!bg-white/20 !text-white hover:!bg-white/30"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </ButtonIcon>

      {/* Write a testimonial */}
      <ButtonIcon
        label={isLoggedIn ? labels.writeTestimonial : labels.signinToWrite}
        tone="default"
        size="sm"
        onClick={openTestimonial}
        className="!bg-white/20 !text-white hover:!bg-white/30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-6.5A4.5 4.5 0 0 1 7.5 11H17a4 4 0 0 1 4 4Z" />
        </svg>
      </ButtonIcon>

      {/* Edit (owner only) */}
      {isOwner && (
        <ButtonIcon
          label={labels.edit}
          tone="default"
          size="sm"
          onClick={openEdit}
          className="!bg-white/20 !text-white hover:!bg-white/30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </ButtonIcon>
      )}

      {/* Animate photos (owner only) — sparkles icon, universal AI affordance */}
      {isOwner && (
        <ButtonIcon
          label={t('animatePhotos')}
          tone="default"
          size="sm"
          onClick={openAnimate}
          className="!bg-accent/90 !text-white hover:!bg-accent"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
        </ButtonIcon>
      )}

      {/* Favorite — with a public hearts counter so the click visibly counts */}
      <div className="relative">
        <ButtonIcon
          label={isFavorite ? labels.liked : labels.like}
          tone="default"
          size="sm"
          onClick={toggleFav}
          aria-pressed={isFavorite}
          className={[
            '!text-white hover:!bg-white/30',
            isFavorite ? '!bg-white/40' : '!bg-white/20',
          ].join(' ')}
        >
          <svg
            viewBox="0 0 24 24"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </ButtonIcon>
        {favCount > 0 && (
          <span
            aria-label={`${favCount} ♥`}
            className="pointer-events-none absolute -bottom-1 -right-1 min-w-[18px] rounded-full bg-white px-1 text-center font-display text-[10px] font-bold leading-[18px] text-accent shadow-sm"
          >
            {favCount > 99 ? '99+' : favCount}
          </span>
        )}
      </div>

      {/* Share */}
      <ButtonIcon
        label={labels.share}
        tone="default"
        size="sm"
        onClick={() => setShareOpen(true)}
        className="!bg-white/20 !text-white hover:!bg-white/30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </ButtonIcon>

      {/* Story viewer + share drawer — both portal to <body> internally. */}
      <PhotoStoryViewer
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        photos={photos}
        memorialName={fullName}
        musicUrl={musicUrl}
        labels={labels.story}
      />
      <MemorialShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={t('shareTitle', { name: fullName })}
        labels={labels.shareDialog}
      />
    </>
  );
}

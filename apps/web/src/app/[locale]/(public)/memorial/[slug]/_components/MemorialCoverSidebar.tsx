'use client';

import { useState } from 'react';
import { useMemorialFavorite } from '@/lib/favorites';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { PhotoStoryViewer, type StoryPhoto } from './PhotoStoryViewer';
import { MemorialShareDialog } from './MemorialShareDialog';

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
  fullName: string;
  shareUrl: string;
  photos: StoryPhoto[];
  musicUrl?: string | null;
  isOwner: boolean;
  isLoggedIn: boolean;
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
  fullName,
  shareUrl,
  photos,
  musicUrl,
  isOwner,
  isLoggedIn,
  labels,
}: Props) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { isFavorite, toggle: toggleFav, hydrated } = useMemorialFavorite(slug);

  function openTestimonial() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=/memorial/${slug}`;
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

      {/* Animate via Higgsfield (owner only) — play icon + small accent + */}
      {isOwner && (
        <ButtonIcon
          label="Animer les photos"
          tone="default"
          size="sm"
          onClick={openAnimate}
          className="!bg-accent/90 !text-white hover:!bg-accent"
        >
          <span className="relative inline-flex">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-white text-accent"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </span>
        </ButtonIcon>
      )}

      {/* Favorite */}
      <ButtonIcon
        label={isFavorite ? labels.liked : labels.like}
        tone="default"
        size="sm"
        onClick={toggleFav}
        aria-pressed={hydrated ? isFavorite : undefined}
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
        title={`En mémoire de ${fullName}`}
        labels={labels.shareDialog}
      />
    </>
  );
}

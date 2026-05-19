'use client';

import { useRouter } from 'next/navigation';
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
  email: string;
  writeTestimonial: string;
  reportThanks: string;
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
  isOwner: boolean;
  isLoggedIn: boolean;
  labels: Labels;
}

export function MemorialCoverSidebar({
  slug,
  fullName,
  shareUrl,
  photos,
  isOwner,
  isLoggedIn,
  labels,
}: Props) {
  const router = useRouter();
  const [storyOpen, setStoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { isFavorite, toggle: toggleFav, hydrated } = useMemorialFavorite(slug);

  function handleWriteTestimonial() {
    // The "Write a testimonial" CTA lives inside the Testimonials tab.
    // Smooth-scroll there and let the tab open the create popup.
    router.push(`/memorial/${slug}?tab=testimonials#testimonial-form`);
    // Best-effort scroll if we're already on the page.
    setTimeout(() => {
      const target = document.querySelector('[data-testimonial-cta]');
      if (target instanceof HTMLElement) target.click();
    }, 100);
  }

  function handleEmail() {
    const subject = encodeURIComponent(`En mémoire de ${fullName}`);
    const body = encodeURIComponent(`${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <>
      {/* Play diaporama */}
      <ButtonIcon
        label={labels.play}
        tone="default"
        size="sm"
        onClick={() => setStoryOpen(true)}
        disabled={photos.length === 0}
        className="!bg-white/20 !text-white hover:!bg-white/30 disabled:!opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </ButtonIcon>

      {/* Write a testimonial — always visible to logged-in users */}
      {isLoggedIn && (
        <ButtonIcon
          label={labels.writeTestimonial}
          tone="default"
          size="sm"
          onClick={handleWriteTestimonial}
          className="!bg-white/20 !text-white hover:!bg-white/30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-6.5A4.5 4.5 0 0 1 7.5 11H17a4 4 0 0 1 4 4Z" />
          </svg>
        </ButtonIcon>
      )}

      {/* Edit (owner only) */}
      {isOwner && (
        <ButtonIcon
          label={labels.edit}
          tone="default"
          size="sm"
          onClick={() => {
            // Defer to the existing edit modal shell — it has a server-rendered
            // entry in the cover area. We just scroll to it.
            const trigger = document.querySelector(
              '[data-memorial-edit-trigger]',
            );
            if (trigger instanceof HTMLElement) trigger.click();
          }}
          className="!bg-white/20 !text-white hover:!bg-white/30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </ButtonIcon>
      )}

      {/* Like / Favorite */}
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

      {/* Email */}
      <ButtonIcon
        label={labels.email}
        tone="default"
        size="sm"
        onClick={handleEmail}
        className="!bg-white/20 !text-white hover:!bg-white/30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16v16H4z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      </ButtonIcon>

      {/* Story viewer (renders portal-style on full screen) */}
      <PhotoStoryViewer
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        photos={photos}
        memorialName={fullName}
        labels={labels.story}
      />

      {/* Share dialog */}
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

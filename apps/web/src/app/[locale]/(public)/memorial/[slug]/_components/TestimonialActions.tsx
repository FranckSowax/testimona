'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toggleLikeAction, reportTestimonialAction } from '../actions';

export function TestimonialActions({
  testimonialId,
  slug,
  initialLikes,
  initiallyLiked,
  commentsCount,
  isLogged,
  shareUrl,
  onToggleComments,
  commentsOpen,
}: {
  testimonialId: string;
  slug: string;
  initialLikes: number;
  initiallyLiked: boolean;
  commentsCount: number;
  isLogged: boolean;
  shareUrl: string;
  onToggleComments: () => void;
  commentsOpen: boolean;
}) {
  const t = useTranslations('testimonial');
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initiallyLiked);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleLike() {
    if (!isLogged) {
      setFeedback(t('loginToInteract'));
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const res = await toggleLikeAction(testimonialId, slug);
      if (res.error) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
        setFeedback(res.error);
      }
    });
  }

  async function handleShare() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback(t('shareCopied'));
      }
    } catch {
      // user cancelled
    }
  }

  function handleReport() {
    if (!isLogged) {
      setFeedback(t('loginToInteract'));
      return;
    }
    const reason = window.prompt(t('reportPrompt'));
    if (!reason) return;
    startTransition(async () => {
      const res = await reportTestimonialAction(testimonialId, reason);
      setFeedback(res.error ?? t('reportSubmitted'));
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={handleLike}
        disabled={pending}
        aria-pressed={liked}
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition',
          liked
            ? 'bg-accent/15 text-accent'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            d="M12 21s-7.5-4.5-9.5-9C1 8 3.5 5 6.5 5c2 0 3.5 1.5 5.5 3 2-1.5 3.5-3 5.5-3C20.5 5 23 8 21.5 12c-2 4.5-9.5 9-9.5 9Z"
          />
        </svg>
        <span>{likes}</span>
      </button>

      <button
        type="button"
        onClick={onToggleComments}
        aria-expanded={commentsOpen}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a8 8 0 0 1-12.4 6.7L3 20l1.5-5A8 8 0 1 1 21 12Z"
          />
        </svg>
        <span>{commentsCount}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14"
          />
        </svg>
        <span>{t('share')}</span>
      </button>

      <button
        type="button"
        onClick={handleReport}
        className="ml-auto text-xs text-muted-foreground/80 hover:text-destructive"
      >
        {t('report')}
      </button>

      {feedback && (
        <p role="status" className="basis-full text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
    </div>
  );
}

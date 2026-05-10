'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { ButtonText } from '@/components/ui/ButtonText';
import { toggleLikeAction } from '../actions';
import { ReportDialog } from './ReportDialog';

interface TestimonialActionsProps {
  testimonialId: string;
  slug: string;
  initialLikes: number;
  initiallyLiked: boolean;
  isLogged: boolean;
  shareUrl: string;
  onToggleComments?: () => void;
  commentsOpen?: boolean;
  /** When true, hides the comment-bubble button (used for replies). */
  hideCommentToggle?: boolean;
}

/**
 * V2 icon row — comment bubble | share | heart | REPORT
 */
export function TestimonialActions({
  testimonialId,
  slug,
  initialLikes,
  initiallyLiked,
  isLogged,
  shareUrl,
  onToggleComments,
  commentsOpen,
  hideCommentToggle = false,
}: TestimonialActionsProps) {
  const t = useTranslations('testimonial');
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initiallyLiked);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

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
    setReportOpen(true);
  }

  return (
    <div className="flex items-center gap-1">
      {!hideCommentToggle && onToggleComments && (
        <ButtonIcon
          label={t('comments')}
          size="sm"
          onClick={onToggleComments}
          active={commentsOpen}
          tone={commentsOpen ? 'pink' : 'default'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a8 8 0 0 1-12.4 6.7L3 20l1.5-5A8 8 0 1 1 21 12Z" />
          </svg>
        </ButtonIcon>
      )}

      <ButtonIcon label={t('share')} size="sm" onClick={handleShare}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </ButtonIcon>

      <ButtonIcon
        label={liked ? t('liked') : t('like')}
        size="sm"
        tone={liked ? 'liked' : 'pink'}
        active={liked}
        onClick={handleLike}
        disabled={pending}
        className={liked ? 'animate-like-pulse' : ''}
      >
        <svg
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </ButtonIcon>

      <ButtonText variant="action" type="button" onClick={handleReport}>
        {t('report')}
      </ButtonText>

      {likes > 0 && (
        <span
          className="ml-1 tabular text-xs text-muted-foreground"
          aria-label={t('likesCount', { count: likes })}
        >
          {likes}
        </span>
      )}

      {feedback && (
        <p role="status" className="ml-3 basis-full text-xs text-muted-foreground">
          {feedback}
        </p>
      )}

      <ReportDialog
        testimonialId={testimonialId}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => {
          setReportOpen(false);
          setFeedback(t('reportSubmitted'));
        }}
      />
    </div>
  );
}

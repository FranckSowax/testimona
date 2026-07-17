'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShareLinkButton } from '@/components/ui/ShareLinkButton';
import {
  togglePhotoLikeAction,
  reportPhotoAction,
  addPhotoCommentAction,
} from '../photo-actions';

export interface PhotoComment {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
}

interface Props {
  photoId: string;
  slug: string;
  shareUrl: string;
  initialLikes: number;
  initiallyLiked: boolean;
  initialComments: PhotoComment[];
  isLoggedIn: boolean;
}

/**
 * Action bar under a photo — comment, like, share, report (PDF p26). Comment,
 * like + report require an account (T7).
 */
export function PhotoActions({
  photoId,
  slug,
  shareUrl,
  initialLikes,
  initiallyLiked,
  initialComments,
  isLoggedIn,
}: Props) {
  const t = useTranslations('memorial.photoActions');
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initiallyLiked);
  const [pending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reportDone, setReportDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>(initialComments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const router = useRouter();

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('photoId', photoId);
      fd.set('slug', slug);
      fd.set('message', message);
      const res = await addPhotoCommentAction(null, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      // Optimistic append (server revalidates the page too).
      setComments((list) => [
        ...list,
        { id: `tmp-${list.length}`, authorName: t('you'), message, createdAt: '' },
      ]);
      setDraft('');
      router.refresh();
    });
  }

  function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=/memorial/${slug}`;
      return;
    }
    // Optimistic.
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    startTransition(async () => {
      const fd = new FormData();
      fd.set('photoId', photoId);
      fd.set('slug', slug);
      const res = await togglePhotoLikeAction(null, fd);
      if (res.error) {
        // Revert on failure.
        setLiked((v) => !v);
        setLikes((n) => n + (liked ? 1 : -1));
        setError(res.error);
        return;
      }
      if (typeof res.count === 'number') setLikes(res.count);
      if (typeof res.liked === 'boolean') setLiked(res.liked);
    });
  }

  function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('photoId', photoId);
      fd.set('reason', reason.trim());
      const res = await reportPhotoAction(null, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setReportDone(true);
      setReportOpen(false);
      setReason('');
    });
  }

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          aria-pressed={liked}
          aria-label={liked ? t('unlike') : t('like')}
          className={[
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors',
            liked ? 'text-accent' : 'hover:text-accent',
          ].join(' ')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes > 0 && <span className="tabular">{likes}</span>}
        </button>

        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          aria-label={t('comments')}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors hover:text-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-6.5A4.5 4.5 0 0 1 7.5 11H17a4 4 0 0 1 4 4Z" />
          </svg>
          {comments.length > 0 && <span className="tabular">{comments.length}</span>}
        </button>

        <ShareLinkButton
          url={shareUrl}
          title={t('shareTitle')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:text-foreground"
        />

        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn) {
              window.location.href = `/login?next=/memorial/${slug}`;
              return;
            }
            setReportOpen((v) => !v);
          }}
          aria-label={t('report')}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors hover:text-destructive"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          {reportDone ? t('reported') : t('report')}
        </button>
      </div>

      {reportOpen && (
        <form onSubmit={submitReport} className="mt-1.5 flex items-center gap-1.5">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder={t('reportPlaceholder')}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-white px-2 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !reason.trim()}
            className="h-8 shrink-0 rounded-md bg-destructive px-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {t('send')}
          </button>
        </form>
      )}

      {commentsOpen && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {comments.length === 0 ? (
            <p className="text-[11px] italic text-muted-foreground">
              {t('noComments')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {comments.map((c) => (
                <li key={c.id} className="text-xs">
                  <span className="font-display font-bold text-foreground">
                    {c.authorName}
                  </span>{' '}
                  <span className="text-foreground/90">{c.message}</span>
                  {c.createdAt && (
                    <time
                      dateTime={c.createdAt}
                      suppressHydrationWarning
                      className="ml-1 tabular text-[10px] text-muted-foreground"
                    >
                      · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isLoggedIn ? (
            <form onSubmit={submitComment} className="flex items-center gap-1.5">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                placeholder={t('commentPlaceholder')}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-white px-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="h-8 shrink-0 rounded-md bg-primary px-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {t('publish')}
              </button>
            </form>
          ) : (
            <a
              href={`/login?next=/memorial/${slug}`}
              className="inline-block text-[11px] font-bold text-primary hover:underline"
            >
              {t('loginToComment')}
            </a>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

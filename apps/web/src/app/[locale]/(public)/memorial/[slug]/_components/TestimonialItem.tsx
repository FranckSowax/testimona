'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { ButtonText } from '@/components/ui/ButtonText';
import { unsplashAvatarFor } from '@/lib/avatars';
import { TestimonialActions } from './TestimonialActions';
import { CommentForm } from './CommentForm';
import { TestimonialOwnerActions } from './TestimonialOwnerActions';
import { updateTestimonialAction, type UpdateTestimonialState } from '../actions';

export interface TestimonialComment {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
}

const PREVIEW_CHAR_LIMIT = 500;
const REPLIES_INITIAL = 5;
const REPLIES_INCREMENT = 5;

interface TestimonialItemProps {
  testimonialId: string;
  slug: string;
  memorialName: string;
  authorName: string;
  authorRelation?: string;
  authorAvatarUrl?: string;
  message: string;
  createdAt: string;
  likesCount: number;
  hasLiked: boolean;
  comments: TestimonialComment[];
  isLogged: boolean;
  isOwner: boolean;
  shareUrl: string;
  currentUserName?: string;
  currentUserAvatarUrl?: string | null;
}

export function TestimonialItem({
  testimonialId,
  slug,
  memorialName,
  authorName,
  authorRelation,
  authorAvatarUrl,
  message,
  createdAt,
  likesCount,
  hasLiked,
  comments,
  isLogged,
  isOwner,
  shareUrl,
  currentUserName,
  currentUserAvatarUrl,
}: TestimonialItemProps) {
  const t = useTranslations('testimonial');
  const router = useRouter();
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesShown, setRepliesShown] = useState(REPLIES_INITIAL);
  const [showFullText, setShowFullText] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message);
  const [state, formAction, isPending] = useActionState<UpdateTestimonialState | null, FormData>(
    updateTestimonialAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR');
  const isLong = message.length > PREVIEW_CHAR_LIMIT;
  const previewMessage = isLong && !showFullText ? message.slice(0, PREVIEW_CHAR_LIMIT) : message;
  const visibleReplies = comments.slice(0, repliesShown);
  const hasMoreReplies = comments.length > repliesShown;

  function toggleReplies() {
    setRepliesOpen((v) => !v);
  }

  return (
    <article
      id={`testimonial-${testimonialId}`}
      className="border-border rounded-lg border bg-white p-5 shadow-[var(--shadow-card)]"
    >
      <header className="flex items-start gap-3">
        <Avatar src={authorAvatarUrl} name={authorName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-foreground text-sm font-bold sm:text-[17px]">
            {memorialName} - {authorName}
            {authorRelation && (
              <span className="font-body text-muted-foreground ml-1 font-bold italic">
                , {authorRelation}
              </span>
            )}
          </p>
          <p className="text-muted-foreground tabular text-xs italic" suppressHydrationWarning>
            {t('publishedOn', { date: formattedDate })}
          </p>
        </div>
        {isOwner && !editing && (
          <TestimonialOwnerActions
            testimonialId={testimonialId}
            slug={slug}
            onEdit={() => {
              setDraft(message);
              setEditing(true);
            }}
          />
        )}
      </header>

      {editing ? (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="testimonialId" value={testimonialId} />
          <input type="hidden" name="slug" value={slug} />
          <textarea
            name="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
            rows={4}
            maxLength={4000}
            className="text-foreground placeholder:text-muted-foreground focus:border-primary block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
          />
          {state?.fieldErrors?.message && (
            <p className="text-destructive text-xs">{state.fieldErrors.message}</p>
          )}
          {state?.error && state.error !== 'Validation' && (
            <p role="alert" className="text-destructive text-xs">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <ButtonOutlined
              type="button"
              variant="thankyou-gray"
              size="sm"
              onClick={() => {
                setEditing(false);
                setDraft(message);
              }}
            >
              {t('cancel')}
            </ButtonOutlined>
            <ButtonOutlined type="submit" variant="popup-rose" size="sm" loading={isPending}>
              {t('save')}
            </ButtonOutlined>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-foreground whitespace-pre-line text-[15px] leading-relaxed">
              {previewMessage}
              {isLong && !showFullText && (
                <>
                  …{' '}
                  <button
                    type="button"
                    onClick={() => setShowFullText(true)}
                    className="font-display text-muted-foreground hover:text-accent text-xs font-bold uppercase tracking-wide transition-colors"
                  >
                    {t('readMore')}
                  </button>
                </>
              )}
            </p>
          </div>

          <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {comments.length > 0 ? (
              <button
                type="button"
                onClick={toggleReplies}
                aria-expanded={repliesOpen}
                aria-controls={`replies-${testimonialId}`}
                className="text-muted-foreground hover:text-foreground text-xs italic transition-colors"
              >
                {t('commentsCount', { count: comments.length })}
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <TestimonialActions
              testimonialId={testimonialId}
              slug={slug}
              initialLikes={likesCount}
              initiallyLiked={hasLiked}
              isLogged={isLogged}
              shareUrl={shareUrl}
              commentsOpen={repliesOpen}
              onToggleComments={toggleReplies}
            />
          </footer>

          {repliesOpen && (
            <div
              id={`replies-${testimonialId}`}
              className="border-accent ml-2 mt-4 space-y-4 border-l-[3px] pl-4 sm:ml-12"
            >
              {visibleReplies.map((c) => (
                <ReplyItem
                  key={c.id}
                  testimonialId={testimonialId}
                  slug={slug}
                  comment={c}
                  isLogged={isLogged}
                  shareUrl={`${shareUrl}#comment-${c.id}`}
                />
              ))}
              {hasMoreReplies && (
                <div className="text-center">
                  <ButtonText
                    variant="action"
                    type="button"
                    onClick={() => setRepliesShown((n) => n + REPLIES_INCREMENT)}
                  >
                    {t('viewMore')}
                  </ButtonText>
                </div>
              )}
              {isLogged && (
                <CommentForm
                  testimonialId={testimonialId}
                  slug={slug}
                  authorName={currentUserName}
                  authorAvatarUrl={currentUserAvatarUrl}
                />
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

interface ReplyItemProps {
  testimonialId: string;
  slug: string;
  comment: TestimonialComment;
  isLogged: boolean;
  shareUrl: string;
}

function ReplyItem({ testimonialId, slug, comment, isLogged, shareUrl }: ReplyItemProps) {
  const t = useTranslations('testimonial');
  const formattedDate = new Date(comment.createdAt).toLocaleDateString('fr-FR');
  const avatarUrl = unsplashAvatarFor(comment.authorName);

  return (
    <article id={`comment-${comment.id}`}>
      <header className="flex items-start gap-3">
        <Avatar src={avatarUrl} name={comment.authorName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-foreground text-sm font-bold">{comment.authorName}</p>
          <p className="text-muted-foreground tabular text-xs italic" suppressHydrationWarning>
            {t('publishedOn', { date: formattedDate })}
          </p>
        </div>
      </header>
      <div className="ml-11 mt-2">
        <p className="text-foreground/90 whitespace-pre-line text-sm leading-relaxed">
          {comment.message}
        </p>
        <footer className="mt-2 flex items-center justify-end gap-1">
          <TestimonialActions
            testimonialId={testimonialId}
            slug={slug}
            initialLikes={0}
            initiallyLiked={false}
            isLogged={isLogged}
            shareUrl={shareUrl}
            hideCommentToggle
          />
        </footer>
      </div>
    </article>
  );
}

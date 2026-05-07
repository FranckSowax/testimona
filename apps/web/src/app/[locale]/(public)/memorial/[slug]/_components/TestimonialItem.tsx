'use client';

import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
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

export function TestimonialItem({
  testimonialId,
  slug,
  authorName,
  message,
  createdAt,
  likesCount,
  hasLiked,
  comments,
  isLogged,
  isOwner,
  shareUrl,
}: {
  testimonialId: string;
  slug: string;
  authorName: string;
  message: string;
  createdAt: string;
  likesCount: number;
  hasLiked: boolean;
  comments: TestimonialComment[];
  isLogged: boolean;
  isOwner: boolean;
  shareUrl: string;
}) {
  const t = useTranslations('testimonial');
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  return (
    <li
      id={`testimonial-${testimonialId}`}
      className="relative overflow-hidden rounded-lg border-l-4 border-primary bg-surface px-6 py-5 pl-12"
    >
      <Image
        src="/images/quote-open.svg"
        alt=""
        width={28}
        height={28}
        className="absolute left-3 top-3 h-7 w-7 opacity-70"
      />

      {isOwner && !editing && (
        <div className="absolute right-3 top-3">
          <TestimonialOwnerActions
            testimonialId={testimonialId}
            slug={slug}
            onEdit={() => {
              setDraft(message);
              setEditing(true);
            }}
          />
        </div>
      )}

      {editing ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="testimonialId" value={testimonialId} />
          <input type="hidden" name="slug" value={slug} />
          <textarea
            name="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
            rows={4}
            maxLength={4000}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {state?.fieldErrors?.message && (
            <p className="text-xs text-destructive">{state.fieldErrors.message}</p>
          )}
          {state?.error && state.error !== 'Validation' && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(message);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-line text-base italic leading-relaxed text-foreground">
            {message}
          </p>
          <Image
            src="/images/quote-close.svg"
            alt=""
            width={20}
            height={20}
            className="ml-auto mt-2 h-5 w-5 opacity-50"
          />
          <footer className="mt-3 flex items-baseline gap-2 not-italic">
            <span className="font-display text-sm font-semibold text-foreground">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString('fr-FR')}
            </span>
          </footer>

          <TestimonialActions
            testimonialId={testimonialId}
            slug={slug}
            initialLikes={likesCount}
            initiallyLiked={hasLiked}
            commentsCount={comments.length}
            isLogged={isLogged}
            shareUrl={shareUrl}
            commentsOpen={open}
            onToggleComments={() => setOpen((v) => !v)}
          />

          {open && (
            <div className="mt-4 border-t border-border/60 pt-4">
              {comments.length > 0 ? (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-md bg-white px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{c.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-foreground/90">{c.message}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {isLogged && <CommentForm testimonialId={testimonialId} slug={slug} />}
            </div>
          )}
        </>
      )}
    </li>
  );
}

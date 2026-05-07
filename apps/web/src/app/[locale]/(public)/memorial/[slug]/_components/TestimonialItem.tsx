'use client';

import Image from 'next/image';
import { useState } from 'react';
import { TestimonialActions } from './TestimonialActions';
import { CommentForm } from './CommentForm';

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
  shareUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="relative overflow-hidden rounded-lg border-l-4 border-primary bg-surface px-6 py-5 pl-12">
      <Image
        src="/images/quote-open.svg"
        alt=""
        width={28}
        height={28}
        className="absolute left-3 top-3 h-7 w-7 opacity-70"
      />
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
    </li>
  );
}

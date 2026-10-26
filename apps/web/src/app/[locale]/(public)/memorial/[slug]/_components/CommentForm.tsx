'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { submitCommentAction, type CommentActionState } from '../actions';

interface CommentFormProps {
  testimonialId: string;
  slug: string;
  authorAvatarUrl?: string | null;
  authorName?: string;
}

/**
 * V2 reply composer — avatar + auto-grow textarea + emoji slot + rose pen submit.
 * Per V2 spec capture 3 : "Write a comment" placeholder, height grows when typing.
 */
export function CommentForm({
  testimonialId,
  slug,
  authorAvatarUrl,
  authorName,
}: CommentFormProps) {
  const t = useTranslations('testimonial');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<CommentActionState | null, FormData>(
    submitCommentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setValue('');
      router.refresh();
    }
  }, [state, router]);

  // Auto-grow textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="testimonialId" value={testimonialId} />
      <input type="hidden" name="slug" value={slug} />

      <div className="flex items-start gap-3">
        <Avatar src={authorAvatarUrl} name={authorName} size="sm" className="mt-1" />
        <div className="focus-within:border-primary flex flex-1 items-end gap-2 rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-3 py-2 transition-[background-color,border-color,box-shadow] duration-150 focus-within:bg-white focus-within:shadow-[var(--shadow-glow-primary)]">
          <textarea
            ref={textareaRef}
            name="message"
            required
            rows={1}
            maxLength={2000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder={t('writeComment')}
            className="text-foreground placeholder:text-muted-foreground block min-h-[24px] flex-1 resize-none bg-transparent text-base outline-none sm:text-sm"
          />

          <ButtonIcon label="Emoji" size="sm" disabled type="button">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </ButtonIcon>
        </div>

        <ButtonIcon
          label={isPending ? t('submittingComment') : t('submitComment')}
          size="sm"
          tone="liked"
          type="submit"
          disabled={isPending || !value.trim()}
          className="mt-1"
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
            <path d="M12 19V6M5 13l7-7 7 7" />
          </svg>
        </ButtonIcon>
      </div>

      {state?.fieldErrors?.message && (
        <p className="text-destructive ml-12 text-xs">{state.fieldErrors.message}</p>
      )}
      {state?.error && state.error !== 'Validation' && (
        <p role="alert" className="text-destructive ml-12 text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}

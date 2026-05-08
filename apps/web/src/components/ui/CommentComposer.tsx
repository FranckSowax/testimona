'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { ButtonIcon } from './ButtonIcon';

interface CommentComposerProps {
  avatarUrl?: string | null;
  avatarName?: string;
  placeholder: string;
  submitLabel: string;
  emojiLabel?: string;
  onSubmit: (text: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * V2 Comment composer : avatar + input + emoji + submit (rose pen icon).
 */
export function CommentComposer({
  avatarUrl,
  avatarName,
  placeholder,
  submitLabel,
  emojiLabel,
  onSubmit,
  disabled = false,
  className,
}: CommentComposerProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const text = value.trim();
    if (!text || submitting || disabled) return;
    setSubmitting(true);
    try {
      await onSubmit(text);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-md border border-border bg-white p-2',
        'focus-within:border-primary focus-within:shadow-[var(--shadow-glow-primary)]',
        'transition-[border-color,box-shadow]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar src={avatarUrl} name={avatarName} size="sm" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled || submitting}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {emojiLabel && (
        <ButtonIcon label={emojiLabel} size="sm" type="button" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </ButtonIcon>
      )}
      <ButtonIcon
        label={submitLabel}
        size="sm"
        tone="liked"
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!value.trim() || submitting || disabled}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 19V6M5 13l7-7 7 7" />
        </svg>
      </ButtonIcon>
    </div>
  );
}

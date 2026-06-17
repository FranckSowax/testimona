'use client';

import { useState } from 'react';

interface Props {
  url: string;
  title: string;
  label?: string;
  className?: string;
}

/**
 * Generic share control — Web Share API when available, clipboard fallback.
 * Reused by the donation card, funeral events, etc.
 */
export function ShareLinkButton({ url, title, label = 'Partager', className }: Props) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* cancelled / unsupported — fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={label}
      className={
        className ??
        'inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--color-bg-hover-gray)] hover:text-foreground'
      }
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Share control for a single funeral event (PDF p39 "ajouter un bouton
 * partage"). Uses the Web Share API when available, otherwise copies the
 * deep link to the clipboard.
 */
export function FuneralEventShareButton({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const t = useTranslations('memorial.funeralSection');
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const shareData = { title, text: title, url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled or unsupported — fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t('shareEventAria')}
      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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
      {copied ? t('linkCopied') : t('shareEvent')}
    </button>
  );
}

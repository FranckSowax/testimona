'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);

  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const targets: { key: string; label: string; href: string; svg: string }[] = [
    {
      key: 'facebook',
      label: t('facebook'),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      svg: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z',
    },
    {
      key: 'twitter',
      label: t('twitter'),
      href: `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`,
      svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z',
    },
    {
      key: 'linkedin',
      label: t('linkedin'),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
      svg: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.5H5.67v7.84h2.67Zm-1.34-9c.86 0 1.55-.7 1.55-1.55a1.55 1.55 0 1 0-3.1 0c0 .85.69 1.55 1.55 1.55Zm11.34 9v-4.6c0-2.4-1.28-3.52-3-3.52-1.4 0-2.04.77-2.39 1.32V10.5h-2.67c.04.78 0 7.84 0 7.84h2.67v-4.38c0-.24.02-.48.09-.65.18-.48.62-.97 1.35-.97.95 0 1.33.72 1.33 1.78v4.22h2.62Z',
    },
    {
      key: 'whatsapp',
      label: t('whatsapp'),
      href: `https://wa.me/?text=${encTitle}%20${encUrl}`,
      svg: 'M19.05 4.91A10 10 0 0 0 12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.46 3.49 1.34 5.01L2 22l5.07-1.33a10.02 10.02 0 0 0 4.97 1.27h.01c5.54 0 10.04-4.5 10.04-10.04 0-2.68-1.04-5.2-2.94-7.09l-.1.1ZM12.05 20.13a8.06 8.06 0 0 1-4.11-1.13l-.3-.18-3.01.79.8-2.93-.19-.3a8.06 8.06 0 0 1-1.24-4.34c0-4.46 3.63-8.09 8.1-8.09a8.04 8.04 0 0 1 5.72 2.37 8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09Z',
    },
  ];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t('title')}>
      {targets.map((target) => (
        <a
          key={target.key}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={target.label}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={target.svg} />
          </svg>
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-white/20"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
        {copied ? '✓' : t('copyLink')}
      </button>
    </div>
  );
}

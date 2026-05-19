'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  labels: {
    aria: string;
    heading: string;
    copy: string;
    copied: string;
    close: string;
    nativeShare: string;
    facebook: string;
    twitter: string;
    whatsapp: string;
    linkedin: string;
    email: string;
  };
}

/**
 * Right-side slide-in drawer. Portals to <body> so the fixed overlay
 * doesn't get clipped by the cover's absolute pill container.
 */
export function MemorialShareDialog({ open, onClose, url, title, labels }: Props) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const enc = (s: string) => encodeURIComponent(s);
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const whatsapp = `https://wa.me/?text=${enc(`${title} ${url}`)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const email = `mailto:?subject=${enc(title)}&body=${enc(url)}`;

  function copy() {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* swallow */
      },
    );
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator).share({ title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }

  const drawer = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.aria}
      className="fixed inset-0 z-[var(--z-modal)]"
    >
      <button
        type="button"
        aria-label={labels.close}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <aside className="animate-slide-in-right absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-[var(--shadow-overlay)] sm:w-[400px]">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">
            {labels.heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>

        <ul className="mt-6 grid grid-cols-5 gap-3">
          <ShareIcon href={facebook} label={labels.facebook}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
            </svg>
          </ShareIcon>
          <ShareIcon href={twitter} label={labels.twitter}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Z" />
            </svg>
          </ShareIcon>
          <ShareIcon href={whatsapp} label={labels.whatsapp}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.05 4.91A10 10 0 0 0 12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.46 3.49 1.34 5.01L2 22l5.07-1.33a10.02 10.02 0 0 0 4.97 1.27h.01c5.54 0 10.04-4.5 10.04-10.04 0-2.68-1.04-5.2-2.94-7.09Z" />
            </svg>
          </ShareIcon>
          <ShareIcon href={linkedin} label={labels.linkedin}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.5H5.67v7.84h2.67Zm-1.34-9c.86 0 1.55-.7 1.55-1.55a1.55 1.55 0 1 0-3.1 0c0 .85.69 1.55 1.55 1.55Zm11.34 9v-4.6c0-2.4-1.28-3.52-3-3.52-1.4 0-2.04.77-2.39 1.32V10.5h-2.67c.04.78 0 7.84 0 7.84h2.67v-4.38c0-.24.02-.48.09-.65.18-.48.62-.97 1.35-.97.95 0 1.33.72 1.33 1.78v4.22h2.62Z" />
            </svg>
          </ShareIcon>
          <ShareIcon href={email} label={labels.email}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2Z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </ShareIcon>
        </ul>

        <div className="mt-6 rounded-md border border-border bg-surface px-3 py-2.5">
          <p className="font-display text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            URL
          </p>
          <p className="mt-1 break-all font-mono text-xs text-foreground">{url}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="mt-3 w-full rounded-md bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {copied ? labels.copied : labels.copy}
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={nativeShare}
            className="mt-3 w-full rounded-md border border-border px-4 py-2.5 font-display text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {labels.nativeShare}
          </button>
        )}
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}

function ShareIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <span className="block h-5 w-5">{children}</span>
      </a>
    </li>
  );
}

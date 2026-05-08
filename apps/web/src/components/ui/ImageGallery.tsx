'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  authorName?: string;
  postedDate?: string;
}

interface ImageGalleryProps {
  open: boolean;
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  title?: string;
  comments?: ReactNode;
  composer?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/**
 * V2 ImageGallery modal — carousel arrows + image centrée (max 502px hauteur)
 * + comments scrollable + composer sticky bottom. Spec : 1191×962px desktop max.
 */
export function ImageGallery({
  open,
  items,
  index,
  onClose,
  onPrev,
  onNext,
  title,
  comments,
  composer,
  trailing,
  className,
}: ImageGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const item = items[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('keydown', handleKeys);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('keydown', handleKeys);
    };
  }, [onClose, onPrev, onNext]);

  if (!item) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={[
        'm-0 w-full max-w-[1191px] max-h-[962px] rounded-2xl bg-white p-0',
        'backdrop:bg-foreground/60 backdrop:backdrop-blur-sm',
        'sm:m-auto',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            {title && (
              <p className="truncate font-display text-sm font-bold text-foreground">{title}</p>
            )}
            {item.authorName && (
              <p className="truncate text-xs italic text-muted-foreground tabular">
                Posted by{' '}
                <span className="font-display not-italic font-semibold text-foreground">
                  {item.authorName}
                </span>
                {item.postedDate && ` — ${item.postedDate}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {trailing}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-[var(--color-bg-hover-gray)] hover:text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="relative flex items-center justify-center bg-secondary" style={{ height: 502 }}>
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="1191px"
            className="object-contain"
            priority
          />
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M15 18l-6-6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {comments && (
          <div className="flex-1 overflow-y-auto border-t border-border px-5 py-4" style={{ maxHeight: 315 }}>
            {comments}
          </div>
        )}

        {composer && (
          <footer className="border-t border-border bg-white p-3">{composer}</footer>
        )}
      </div>
    </dialog>
  );
}

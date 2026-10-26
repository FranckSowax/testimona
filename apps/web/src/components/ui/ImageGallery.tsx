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
        'm-0 max-h-[962px] w-full max-w-[1191px] rounded-2xl bg-white p-0',
        'backdrop:bg-foreground/60 backdrop:backdrop-blur-sm',
        'sm:m-auto',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="border-border flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            {title && (
              <p className="font-display text-foreground truncate text-sm font-bold">{title}</p>
            )}
            {item.authorName && (
              <p className="text-muted-foreground tabular truncate text-xs italic">
                Posted by{' '}
                <span className="font-display text-foreground font-semibold not-italic">
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
              className="text-muted-foreground hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-bg-hover-gray)]"
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

        <div
          className="bg-secondary relative flex items-center justify-center"
          style={{ height: 502 }}
        >
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
                className="text-foreground absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
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
                className="text-foreground absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
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
          <div
            className="border-border flex-1 overflow-y-auto border-t px-5 py-4"
            style={{ maxHeight: 315 }}
          >
            {comments}
          </div>
        )}

        {composer && <footer className="border-border border-t bg-white p-3">{composer}</footer>}
      </div>
    </dialog>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type Width = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  width?: Width;
  className?: string;
}

const WIDTH: Record<Width, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * V2 light card popup base — bg white, rounded 2xl, close X, configurable width.
 * Used for : Testimonial Create, Thank You, Donation, Biography, Funerals, Memorial admin.
 */
export function PopupCard({
  open,
  onClose,
  ariaLabel,
  children,
  width = 'md',
  className,
}: PopupCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={[
        'mx-auto my-0 w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] p-0',
        'sm:my-auto sm:max-h-[calc(100vh-2rem)]',
        WIDTH[width],
        'rounded-2xl border border-border bg-white shadow-[var(--shadow-overlay)]',
        'backdrop:bg-foreground/40 backdrop:backdrop-blur-sm',
        'overflow-y-auto overscroll-contain',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="animate-pop-in relative p-4 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--color-bg-hover-gray)] hover:text-foreground sm:right-3 sm:top-3"
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
        {children}
      </div>
    </dialog>
  );
}

interface PopupHeaderProps {
  scriptTitle: string;
  subtitle?: string;
  className?: string;
}

/**
 * V2 popup header : Debby rose script title (rotated -2deg) + Montserrat subtitle.
 */
export function PopupHeader({ scriptTitle, subtitle, className }: PopupHeaderProps) {
  return (
    <header className={['text-center', className ?? ''].filter(Boolean).join(' ')}>
      <h2 className="relative inline-block">
        <span
          className="-rotate-2 inline-block text-4xl text-accent sm:text-5xl"
          style={{ fontFamily: 'var(--font-cursive)' }}
        >
          {scriptTitle}
        </span>
      </h2>
      {subtitle && (
        <p className="mt-1 font-display text-base text-foreground/80">{subtitle}</p>
      )}
    </header>
  );
}

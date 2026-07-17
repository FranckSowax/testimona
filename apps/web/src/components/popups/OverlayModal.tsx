'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface OverlayModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

/**
 * V2 full-screen navy overlay (Login / Signup / Welcome modals).
 * Spec : bg #2d3250 full-viewport, close X top-right (white circle outline).
 * Backdrop blur subtle, escape closes, click outside content closes.
 */
export function OverlayModal({
  open,
  onClose,
  ariaLabel,
  children,
  className,
}: OverlayModalProps) {
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
      className={[
        'fixed inset-0 m-0 h-[100dvh] w-screen max-w-none p-0 overflow-y-auto overscroll-contain',
        'bg-secondary text-white',
        'backdrop:bg-secondary/95 backdrop:backdrop-blur-sm',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative flex min-h-[100dvh] flex-col">
        {/* Sticky so the close button stays reachable while tall content
            scrolls (previously scrolled away; only Escape closed it). */}
        <div className="pointer-events-none sticky top-0 z-10 flex h-0 justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pointer-events-auto m-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-secondary/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white sm:m-6"
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
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
          {children}
        </div>
      </div>
    </dialog>
  );
}

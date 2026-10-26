'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'bottom' | 'right';
  className?: string;
}

export function Sheet({ open, onClose, title, children, side = 'bottom', className }: SheetProps) {
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

  const positionClasses =
    side === 'right'
      ? 'top-0 right-0 h-full w-full max-w-sm'
      : 'bottom-0 left-0 right-0 w-full max-h-[90vh]';

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={[
        'backdrop:bg-foreground/40 fixed m-0 p-0 backdrop:backdrop-blur-sm',
        'text-foreground bg-transparent',
        positionClasses,
      ].join(' ')}
      aria-labelledby={title ? 'sheet-title' : undefined}
    >
      <div
        className={[
          'animate-fade-in surface-glass flex flex-col overflow-hidden',
          side === 'bottom' ? 'rounded-t-2xl' : 'h-full rounded-l-2xl',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {side === 'bottom' && (
          <div aria-hidden="true" className="bg-foreground/20 mx-auto mt-2 h-1 w-10 rounded-full" />
        )}
        {title && (
          <header className="border-border/50 flex items-center justify-between gap-3 border-b px-5 py-4">
            <h2 id="sheet-title" className="font-display text-foreground text-base font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-foreground/60 hover:bg-foreground/5 hover:text-foreground rounded-full p-1"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ children, ariaLabel }: { children: ReactNode; ariaLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function dismiss() {
    router.back();
  }

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) dismiss();
  }

  return (
    <dialog
      ref={ref}
      aria-label={ariaLabel}
      onClose={dismiss}
      onClick={onBackdropClick}
      className="border-border backdrop:bg-foreground/40 mx-auto my-0 max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md overflow-y-auto overscroll-contain rounded-2xl border bg-white p-0 shadow-[var(--shadow-overlay)] backdrop:backdrop-blur-sm sm:my-auto sm:max-h-[calc(100vh-2rem)]"
    >
      <div className="animate-pop-in relative p-4 sm:p-6">
        <button
          type="button"
          aria-label="Fermer"
          onClick={dismiss}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 sm:right-3 sm:top-3"
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

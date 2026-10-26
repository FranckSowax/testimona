'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteTestimonialAction } from '../actions';

export function TestimonialOwnerActions({
  testimonialId,
  slug,
  onEdit,
}: {
  testimonialId: string;
  slug: string;
  onEdit: () => void;
}) {
  const t = useTranslations('testimonial');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleEdit() {
    setOpen(false);
    onEdit();
  }

  function handleDelete() {
    if (!window.confirm(t('confirmDelete'))) return;
    setOpen(false);
    startTransition(async () => {
      await deleteTestimonialAction(testimonialId, slug);
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={t('ownerMenu')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="border-border absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-md border bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleEdit}
            className="text-foreground hover:bg-muted block w-full px-3 py-2 text-left text-sm"
          >
            {t('edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10 block w-full px-3 py-2 text-left text-sm"
          >
            {pending ? t('deleting') : t('delete')}
          </button>
        </div>
      )}
    </div>
  );
}

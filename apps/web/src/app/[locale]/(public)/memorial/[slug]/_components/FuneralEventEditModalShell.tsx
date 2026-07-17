'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  FuneralEventCreatePopup,
  type FuneralEventValues,
} from '@/components/popups/FuneralsModals';
import { updateFuneralEventAction } from '../_actions/funeral';

interface Props {
  id: string;
  slug: string;
  initial: Partial<FuneralEventValues>;
}

/**
 * Owner-only edit control for a funeral event (PDF p39). Reuses the create
 * popup in `mode="edit"` pre-filled with the current values.
 */
export function FuneralEventEditModalShell({ id, slug, initial }: Props) {
  const t = useTranslations('memorial.funeralSection');
  const tActions = useTranslations('memorial.actions');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: FuneralEventValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('id', id);
        fd.set('slug', slug);
        fd.set('title', values.title);
        fd.set('date', values.date);
        fd.set('startsAt', values.startsAt);
        fd.set('endsAt', values.endsAt);
        if (values.url) fd.set('url', values.url);
        if (values.note) fd.set('note', values.note);
        if (values.location) fd.set('location', values.location);
        if (values.address) fd.set('address', values.address);

        const result = await updateFuneralEventAction(null, fd);
        if (result?.error) {
          setError(
            result.error === 'Validation' ? tActions('checkRequiredFields') : result.error,
          );
          resolve();
          return;
        }
        if (result?.ok) {
          setOpen(false);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('editEventAria')}
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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        {t('editEvent')}
      </button>
      <FuneralEventCreatePopup
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitting={pending}
        mode="edit"
        initial={initial}
      />
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

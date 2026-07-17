'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import {
  FuneralEventCreatePopup,
  type FuneralEventValues,
} from '@/components/popups/FuneralsModals';
import { createFuneralEventAction } from '../_actions/funeral';

interface FuneralEventCreateModalShellProps {
  memorialId: string;
  slug: string;
  ctaLabel?: string;
}

export function FuneralEventCreateModalShell({
  memorialId,
  slug,
  ctaLabel,
}: FuneralEventCreateModalShellProps) {
  const tActions = useTranslations('memorial.actions');
  const label = ctaLabel ?? tActions('addEvent');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: FuneralEventValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('title', values.title);
        fd.set('date', values.date);
        fd.set('startsAt', values.startsAt);
        fd.set('endsAt', values.endsAt);
        if (values.url) fd.set('url', values.url);
        if (values.note) fd.set('note', values.note);
        if (values.location) fd.set('location', values.location);
        if (values.address) fd.set('address', values.address);

        const result = await createFuneralEventAction(null, fd);
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
      <ButtonOutlined
        variant="page-gray"
        size="md"
        onClick={() => setOpen(true)}
        type="button"
      >
        {label}
      </ButtonOutlined>
      <FuneralEventCreatePopup
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitting={pending}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

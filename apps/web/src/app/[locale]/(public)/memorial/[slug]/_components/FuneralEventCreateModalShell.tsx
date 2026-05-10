'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
  ctaLabel = '+ Add an event',
}: FuneralEventCreateModalShellProps) {
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
        if (values.location) fd.set('location', values.location);

        const result = await createFuneralEventAction(null, fd);
        if (result?.error) {
          setError(
            result.error === 'Validation' ? 'Vérifie les champs requis.' : result.error,
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
        {ctaLabel}
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

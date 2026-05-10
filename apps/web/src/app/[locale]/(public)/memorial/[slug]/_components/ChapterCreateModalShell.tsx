'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import {
  BiographyChapterCreatePopup,
  type ChapterFormValues,
} from '@/components/popups/BiographyModals';
import { createChapterAction } from '../_actions/biography';

interface ChapterCreateModalShellProps {
  memorialId: string;
  slug: string;
  ctaLabel?: string;
}

export function ChapterCreateModalShell({
  memorialId,
  slug,
  ctaLabel = '+ Add a life chapter',
}: ChapterCreateModalShellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ChapterFormValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('title', values.title);
        fd.set('content', values.content);

        const result = await createChapterAction(null, fd);
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
      <BiographyChapterCreatePopup
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

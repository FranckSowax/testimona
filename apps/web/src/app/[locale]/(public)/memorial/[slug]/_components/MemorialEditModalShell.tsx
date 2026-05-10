'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  MemorialFormPopup,
  type MemorialFormValues,
} from '@/components/popups/MemorialAdminModals';
import { ButtonText } from '@/components/ui/ButtonText';
import { updateMemorialAction } from '../_actions/memorial-update';

interface MemorialEditModalShellProps {
  memorialId: string;
  slug: string;
  initial: Partial<MemorialFormValues>;
  ctaLabel?: string;
}

export function MemorialEditModalShell({
  memorialId,
  slug,
  initial,
  ctaLabel = 'Edit memorial',
}: MemorialEditModalShellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: MemorialFormValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('firstname', values.firstname);
        fd.set('lastname', values.lastname);
        if (values.birthYear) {
          fd.set('birthYear', values.birthYear);
          if (values.birthMonth) fd.set('birthMonth', values.birthMonth);
          if (values.birthDay) fd.set('birthDay', values.birthDay);
        }
        fd.set('deathYear', values.deathYear);
        if (values.deathMonth) fd.set('deathMonth', values.deathMonth);
        if (values.deathDay) fd.set('deathDay', values.deathDay);
        if (values.bio) fd.set('description', values.bio);

        const result = await updateMemorialAction(null, fd);
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
      <ButtonText variant="action" type="button" onClick={() => setOpen(true)}>
        {ctaLabel}
      </ButtonText>
      <MemorialFormPopup
        open={open}
        onClose={() => setOpen(false)}
        mode="edit"
        initial={initial}
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

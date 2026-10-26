'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  MemorialFormPopup,
  type MemorialFormValues,
} from '@/components/popups/MemorialAdminModals';
import { ButtonText } from '@/components/ui/ButtonText';
import { updateMemorialAction } from '../_actions/memorial-update';

/**
 * Custom event the cover sidebar (and any other external trigger) can
 * dispatch to open this modal without needing a direct ref.
 */
const OPEN_EVENT = 'testimona:open-memorial-edit';

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
  ctaLabel,
}: MemorialEditModalShellProps) {
  const tActions = useTranslations('memorial.actions');
  const label = ctaLabel ?? tActions('editMemorial');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

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
        // Always set musicUrl (including empty) so the action can clear it.
        fd.set('musicUrl', values.musicUrl ?? '');
        if (values.portraitFile) fd.set('portraitPhoto', values.portraitFile);
        if (values.coverFile) fd.set('coverPhoto', values.coverFile);

        const result = await updateMemorialAction(null, fd);
        if (result?.error) {
          setError(result.error === 'Validation' ? tActions('checkRequiredFields') : result.error);
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
        {label}
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
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </>
  );
}

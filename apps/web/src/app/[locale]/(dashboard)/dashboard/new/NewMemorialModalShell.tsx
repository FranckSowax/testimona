'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  MemorialFormPopup,
  type MemorialFormValues,
} from '@/components/popups/MemorialAdminModals';
import { createMemorialAction } from './actions';

/**
 * V2 client shell for /dashboard/new — wraps the V2 MemorialFormPopup (mode=create)
 * and bridges its `onSubmit` callback to the existing Server Action.
 *
 * Spec : PDF p23 column (C) "The memorial page / Create a new" popup.
 * On close → router.back() (returns to dashboard).
 * On success → redirect to /memorial/[slug].
 */
export function NewMemorialModalShell() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setTimeout(() => router.back(), 200);
  }

  async function handleSubmit(values: MemorialFormValues) {
    setActionError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set('firstname', values.firstname);
          fd.set('lastname', values.lastname);
          if (values.birthYear) {
            const m = values.birthMonth?.padStart(2, '0') || '01';
            const d = values.birthDay?.padStart(2, '0') || '01';
            fd.set('birthDate', `${values.birthYear}-${m}-${d}`);
          }
          const dm = values.deathMonth?.padStart(2, '0') || '01';
          const dd = values.deathDay?.padStart(2, '0') || '01';
          fd.set('deathDate', `${values.deathYear}-${dm}-${dd}`);
          fd.set('language', 'fr');
          fd.set('isPublic', 'on');
          if (values.bio) fd.set('description', values.bio);

          const result = await createMemorialAction(null, fd);

          if (result.error) {
            setActionError(
              result.error === 'Validation' ? 'Vérifie les champs requis.' : result.error,
            );
            resolve();
            return;
          }
          if (result.ok && result.slug) {
            window.location.href = `/memorial/${result.slug}`;
            return;
          }
          resolve();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Erreur inconnue.');
          resolve();
        }
      });
    });
  }

  return (
    <>
      <MemorialFormPopup
        open={open}
        onClose={handleClose}
        mode="create"
        onSubmit={handleSubmit}
        submitting={pending}
      />
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-lg"
        >
          {actionError}
        </div>
      )}
    </>
  );
}

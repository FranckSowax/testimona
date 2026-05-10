'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { KebabMenu } from '@/components/ui/KebabMenu';
import {
  BiographyEditPopup,
  type BiographyInfoValues,
} from '@/components/popups/BiographyModals';
import {
  updateBiographyInfoAction,
  deleteBiographyInfoAction,
} from '../_actions/admin';

export interface BiographyInfo {
  username: string | null;
  homeCity: string | null;
  placesLived: string | null;
  relatives: string | null;
  religion: string | null;
  education: string | null;
  work: string | null;
  hobby: string | null;
}

interface Props {
  memorialId: string;
  slug: string;
  bio: BiographyInfo | null;
  isOwner: boolean;
}

export function BiographyInfoCard({ memorialId, slug, bio, isOwner }: Props) {
  const tFields = useTranslations('popups.biographyEdit');
  const tActions = useTranslations('memorial.actions');
  const tSection = useTranslations('memorial.biographySection');
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fields: { label: string; value: string | null }[] = [
    { label: tFields('username'), value: bio?.username ?? null },
    { label: tFields('homeCity'), value: bio?.homeCity ?? null },
    { label: tFields('placesLived'), value: bio?.placesLived ?? null },
    { label: tFields('relatives'), value: bio?.relatives ?? null },
    { label: tFields('religion'), value: bio?.religion ?? null },
    { label: tFields('education'), value: bio?.education ?? null },
    { label: tFields('work'), value: bio?.work ?? null },
    { label: tFields('hobby'), value: bio?.hobby ?? null },
  ];

  async function handleEdit(values: BiographyInfoValues) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        Object.entries(values).forEach(([k, v]) => {
          if (v) fd.set(k, v);
        });
        const result = await updateBiographyInfoAction(null, fd);
        if (result?.ok) {
          setEditOpen(false);
          router.refresh();
        }
        resolve();
      });
    });
  }

  function handleDelete() {
    if (!confirm(tActions('deleteBiographyConfirm'))) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('memorialId', memorialId);
      fd.set('slug', slug);
      const result = await deleteBiographyInfoAction(null, fd);
      if (result?.ok) router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-bold text-foreground">
          {tSection('heading')}
        </h3>
        {isOwner && (
          <KebabMenu
            label="Biography menu"
            items={[
              {
                id: 'edit',
                label: tActions('editBiography'),
                onSelect: () => setEditOpen(true),
              },
              {
                id: 'delete',
                label: tActions('deleteBiography'),
                destructive: true,
                disabled: pending,
                onSelect: handleDelete,
              },
            ]}
          />
        )}
      </header>

      <dl className="space-y-2 text-sm">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-wrap gap-x-2">
            <dt className="font-display font-bold text-foreground">{f.label} :</dt>
            <dd className="text-foreground/80">{f.value || ''}</dd>
          </div>
        ))}
      </dl>

      {isOwner && (
        <BiographyEditPopup
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            username: bio?.username ?? '',
            homeCity: bio?.homeCity ?? '',
            placesLived: bio?.placesLived ?? '',
            relatives: bio?.relatives ?? '',
            religion: bio?.religion ?? '',
            education: bio?.education ?? '',
            work: bio?.work ?? '',
            hobby: bio?.hobby ?? '',
          }}
          onSubmit={handleEdit}
          submitting={pending}
        />
      )}
    </article>
  );
}

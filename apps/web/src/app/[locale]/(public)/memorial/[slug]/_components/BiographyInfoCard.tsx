'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { BiographyEditPopup, type BiographyInfoValues } from '@/components/popups/BiographyModals';
import { updateBiographyInfoAction, deleteBiographyInfoAction } from '../_actions/admin';

export interface BiographyInfo {
  username: string | null;
  homeCity: string | null;
  placesLived: string | null;
  relatives: string | null;
  religion: string | null;
  education: string | null;
  work: string | null;
  hobby: string | null;
  socialLinks: string | null;
}

/** Split the stored newline/comma-separated links into clean URLs. */
function parseSocialLinks(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`));
}

/** Short label for a social link (host without www). */
function socialLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
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
    <article className="border-border rounded-lg border bg-white p-5 shadow-[var(--shadow-card)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-foreground text-base font-bold">{tSection('heading')}</h3>
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
            <dt className="font-display text-foreground font-bold">{f.label} :</dt>
            <dd className="text-foreground/80">{f.value || ''}</dd>
          </div>
        ))}
      </dl>

      {parseSocialLinks(bio?.socialLinks ?? null).length > 0 && (
        <div className="border-border mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
            {tFields('socialLinks')}
          </span>
          {parseSocialLinks(bio?.socialLinks ?? null).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border bg-surface font-display text-primary hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors"
            >
              {socialLabel(url)}
            </a>
          ))}
        </div>
      )}

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
            socialLinks: bio?.socialLinks ?? '',
          }}
          onSubmit={handleEdit}
          submitting={pending}
        />
      )}
    </article>
  );
}

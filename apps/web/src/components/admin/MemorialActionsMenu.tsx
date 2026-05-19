'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { KebabMenu } from '@/components/ui/KebabMenu';
import {
  setMemorialVisibilityAction,
  deleteMemorialAction,
  type AdminMemorialActionState,
} from '@/app/[locale]/(admin)/admin/memorials/actions';

type AdminAction = (
  prev: AdminMemorialActionState | null,
  fd: FormData,
) => Promise<AdminMemorialActionState>;

interface Labels {
  view: string;
  makePublic: string;
  makePrivate: string;
  delete: string;
  confirmDelete: string;
}

interface Props {
  memorialId: string;
  slug: string;
  isPublic: boolean;
  labels: Labels;
}

export function MemorialActionsMenu({ memorialId, slug, isPublic, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runAction(action: AdminAction, fd: FormData) {
    startTransition(async () => {
      await action(null, fd);
      router.refresh();
    });
  }

  function toggleVisibility() {
    const fd = new FormData();
    fd.set('memorialId', memorialId);
    fd.set('isPublic', String(!isPublic));
    runAction(setMemorialVisibilityAction, fd);
  }

  function remove() {
    if (!confirm(labels.confirmDelete)) return;
    const fd = new FormData();
    fd.set('memorialId', memorialId);
    startTransition(async () => {
      await deleteMemorialAction(null, fd);
      router.push('/admin/memorials');
      router.refresh();
    });
  }

  return (
    <KebabMenu
      label="Memorial actions"
      items={[
        {
          id: 'view',
          label: labels.view,
          onSelect: () => window.open(`/memorial/${slug}`, '_blank'),
        },
        {
          id: 'visibility',
          label: isPublic ? labels.makePrivate : labels.makePublic,
          disabled: pending,
          onSelect: toggleVisibility,
        },
        {
          id: 'delete',
          label: labels.delete,
          destructive: true,
          disabled: pending,
          onSelect: remove,
        },
      ]}
    />
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  deleteAdAction,
  toggleAdActiveAction,
  type AdActionState,
} from '@/app/[locale]/(admin)/admin/ads/actions';

type Action = (prev: AdActionState | null, fd: FormData) => Promise<AdActionState>;

interface Labels {
  delete: string;
  confirmDelete: string;
  activate: string;
  deactivate: string;
}

export function AdRowActions({
  id,
  isActive,
  labels,
}: {
  id: string;
  isActive: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: Action, fd: FormData) {
    startTransition(async () => {
      await action(null, fd);
      router.refresh();
    });
  }

  function toggle() {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('isActive', String(!isActive));
    run(toggleAdActiveAction as Action, fd);
  }

  function remove() {
    if (!confirm(labels.confirmDelete)) return;
    const fd = new FormData();
    fd.set('id', id);
    run(deleteAdAction as Action, fd);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="border-border font-display text-muted-foreground hover:bg-surface hover:text-foreground rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
      >
        {isActive ? labels.deactivate : labels.activate}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="border-destructive/40 font-display text-destructive hover:bg-destructive rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:text-white disabled:opacity-50"
      >
        {labels.delete}
      </button>
    </div>
  );
}

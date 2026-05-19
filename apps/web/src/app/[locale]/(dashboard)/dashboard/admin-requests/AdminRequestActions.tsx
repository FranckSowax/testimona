'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  resolveAdminRequestAction,
  type AdminActionState,
} from '@/app/[locale]/(public)/memorial/[slug]/_actions/admin';

type Action = (prev: AdminActionState | null, fd: FormData) => Promise<AdminActionState>;

interface Props {
  requestId: string;
  memorialId: string;
  memorialSlug: string;
  labels: { accept: string; decline: string };
}

export function AdminRequestActions({
  requestId,
  memorialId,
  memorialSlug,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(decision: 'accepted' | 'declined') {
    const fd = new FormData();
    fd.set('requestId', requestId);
    fd.set('memorialId', memorialId);
    fd.set('slug', memorialSlug);
    fd.set('decision', decision);
    startTransition(async () => {
      await (resolveAdminRequestAction as Action)(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => run('declined')}
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
      >
        {labels.decline}
      </button>
      <button
        type="button"
        onClick={() => run('accepted')}
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {labels.accept}
      </button>
    </div>
  );
}

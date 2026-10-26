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

export function AdminRequestActions({ requestId, memorialId, memorialSlug, labels }: Props) {
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
        className="border-border font-display text-muted-foreground hover:bg-surface hover:text-foreground rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
      >
        {labels.decline}
      </button>
      <button
        type="button"
        onClick={() => run('accepted')}
        disabled={pending}
        className="bg-primary font-display text-primary-foreground rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {labels.accept}
      </button>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { respondToMemorialInviteAction } from '@/app/[locale]/(public)/memorial/[slug]/_actions/members';

export function MemorialInviteActions({
  memberId,
  labels,
}: {
  memberId: string;
  labels: { accept: string; decline: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(decision: 'accepted' | 'rejected') {
    const fd = new FormData();
    fd.set('memberId', memberId);
    fd.set('decision', decision);
    startTransition(async () => {
      await respondToMemorialInviteAction(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => run('rejected')}
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

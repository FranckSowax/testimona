'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeMemberAction } from '../_actions/members';

export function MemberRemoveButton({
  memberId,
  slug,
  label = 'Retirer',
}: {
  memberId: string;
  slug: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm('Retirer cet administrateur ?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('memberId', memberId);
      fd.set('slug', slug);
      await removeMemberAction(null, fd);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="rounded-md border border-border px-2.5 py-1 font-display text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
    >
      {label}
    </button>
  );
}

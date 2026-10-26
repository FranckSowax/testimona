'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  deleteTestimonialAction,
  dismissReportAction,
  dismissAllReportsForTestimonialAction,
  type ModerationActionState,
} from '@/app/[locale]/(admin)/admin/moderation/actions';

type Action = (prev: ModerationActionState | null, fd: FormData) => Promise<ModerationActionState>;

interface Labels {
  delete: string;
  dismiss: string;
  dismissAll: string;
  confirmDelete: string;
}

export function TestimonialDeleteButton({
  testimonialId,
  labels,
}: {
  testimonialId: string;
  labels: Pick<Labels, 'delete' | 'confirmDelete'>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(labels.confirmDelete)) return;
    const fd = new FormData();
    fd.set('testimonialId', testimonialId);
    startTransition(async () => {
      await (deleteTestimonialAction as Action)(null, fd);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="border-destructive/40 font-display text-destructive hover:bg-destructive rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:text-white disabled:opacity-50"
    >
      {labels.delete}
    </button>
  );
}

export function ReportDismissButton({
  reportId,
  labels,
}: {
  reportId: string;
  labels: Pick<Labels, 'dismiss'>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function dismiss() {
    const fd = new FormData();
    fd.set('reportId', reportId);
    startTransition(async () => {
      await (dismissReportAction as Action)(null, fd);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={pending}
      className="border-border font-display text-muted-foreground hover:bg-surface hover:text-foreground rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
    >
      {labels.dismiss}
    </button>
  );
}

export function ReportDismissAllButton({
  testimonialId,
  labels,
}: {
  testimonialId: string;
  labels: Pick<Labels, 'dismissAll'>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function dismissAll() {
    const fd = new FormData();
    fd.set('testimonialId', testimonialId);
    startTransition(async () => {
      await (dismissAllReportsForTestimonialAction as Action)(null, fd);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={dismissAll}
      disabled={pending}
      className="border-border font-display text-muted-foreground hover:bg-surface hover:text-foreground rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
    >
      {labels.dismissAll}
    </button>
  );
}

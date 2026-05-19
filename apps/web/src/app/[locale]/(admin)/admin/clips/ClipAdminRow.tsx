'use client';

import { useActionState } from 'react';
import {
  adminDeleteClipAction,
  adminForceFailClipAction,
  type AdminClipActionState,
} from './actions';

export function ClipAdminRow({
  id,
  status,
  videoUrl,
}: {
  id: string;
  status: string;
  videoUrl: string | null;
}) {
  const [, failAction, failPending] = useActionState<
    AdminClipActionState | null,
    FormData
  >(adminForceFailClipAction, null);
  const [, delAction, delPending] = useActionState<
    AdminClipActionState | null,
    FormData
  >(adminDeleteClipAction, null);

  return (
    <div className="flex shrink-0 items-center gap-1">
      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvrir le MP4"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
      <span
        className={[
          'rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider',
          status === 'ready'
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'failed'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
        ].join(' ')}
      >
        {status}
      </span>
      {status !== 'failed' && (
        <form action={failAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={failPending}
            aria-label="Marquer échoué + rembourser"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9" />
              <polyline points="3 4 3 12 11 12" />
            </svg>
          </button>
        </form>
      )}
      <form action={delAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={delPending}
          aria-label="Supprimer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}

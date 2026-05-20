'use client';

import { useActionState } from 'react';
import {
  regenerateMemorialVisualAction,
  deleteMemorialVisualAction,
  type ShopActionState,
} from '../_actions/shop';

/**
 * Owner-only mini toolbar shown under each ready visual in the shop
 * owner panel: regenerate (creates a new visual from the same source
 * photo, keeps the old one) and delete (removes the visual; any shop
 * item using it loses its visualId via FK cascade).
 */
export function VisualActions({ visualId }: { visualId: string }) {
  const [regenState, regenAction, regenPending] = useActionState<
    ShopActionState | null,
    FormData
  >(regenerateMemorialVisualAction, null);
  const [delState, delAction, delPending] = useActionState<
    ShopActionState | null,
    FormData
  >(deleteMemorialVisualAction, null);

  return (
    <div className="flex items-center justify-center gap-1.5 p-1.5">
      <form action={regenAction} className="flex-1">
        <input type="hidden" name="id" value={visualId} />
        <button
          type="submit"
          disabled={regenPending}
          aria-label="Regénérer un nouveau visuel à partir de la même photo"
          className="press-scale flex w-full items-center justify-center gap-1 rounded-md border border-accent/40 bg-white px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent/5 disabled:opacity-50"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
          Regen
        </button>
      </form>
      <form action={delAction}>
        <input type="hidden" name="id" value={visualId} />
        <button
          type="submit"
          disabled={delPending}
          aria-label="Supprimer ce visuel"
          className="press-scale inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </form>
      {(regenState?.error || delState?.error) && (
        <p
          role="alert"
          className="ml-1 truncate text-[10px] text-destructive"
        >
          {regenState?.error || delState?.error}
        </p>
      )}
    </div>
  );
}

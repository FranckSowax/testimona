'use client';

import { useActionState, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  adminDeleteClipAction,
  adminForceFailClipAction,
  type AdminClipActionState,
} from './actions';

type Confirm = { kind: 'fail' } | { kind: 'delete' } | null;

export function ClipAdminRow({
  id,
  status,
  videoUrl,
}: {
  id: string;
  status: string;
  videoUrl: string | null;
}) {
  const [, failAction, failPending] = useActionState<AdminClipActionState | null, FormData>(
    adminForceFailClipAction,
    null,
  );
  const [, delAction, delPending] = useActionState<AdminClipActionState | null, FormData>(
    adminDeleteClipAction,
    null,
  );
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirm(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirm]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ouvrir le MP4"
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        <span
          className={[
            'font-display rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
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
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'fail' })}
            disabled={failPending}
            aria-label="Marquer échoué + rembourser"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9" />
              <polyline points="3 4 3 12 11 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirm({ kind: 'delete' })}
          disabled={delPending}
          aria-label="Supprimer"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
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
      </div>

      {confirm &&
        mounted &&
        createPortal(
          <ConfirmModal
            kind={confirm.kind}
            clipId={id}
            onCancel={() => setConfirm(null)}
            failAction={failAction}
            delAction={delAction}
            failPending={failPending}
            delPending={delPending}
          />,
          document.body,
        )}
    </>
  );
}

function ConfirmModal({
  kind,
  clipId,
  onCancel,
  failAction,
  delAction,
  failPending,
  delPending,
}: {
  kind: 'fail' | 'delete';
  clipId: string;
  onCancel: () => void;
  failAction: (formData: FormData) => void;
  delAction: (formData: FormData) => void;
  failPending: boolean;
  delPending: boolean;
}) {
  const action = kind === 'fail' ? failAction : delAction;
  const pending = kind === 'fail' ? failPending : delPending;

  const title =
    kind === 'fail' ? 'Marquer ce clip comme échoué ?' : 'Supprimer ce clip définitivement ?';

  const body =
    kind === 'fail'
      ? 'Le clip passera en statut "failed". Le crédit Testimona du créateur (1) et les crédits compute Studia (30) seront automatiquement remboursés. Le clip restera visible dans la base mais n\'apparaîtra plus dans le diaporama public.'
      : 'Cette action est irréversible. Le clip sera supprimé de la base. Les crédits déjà débités ne seront pas remboursés par cette action.';

  const cta = kind === 'fail' ? "Confirmer l'échec" : 'Supprimer';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Annuler"
        onClick={() => !pending && onCancel()}
        className="bg-foreground/50 absolute inset-0 backdrop-blur-sm"
      />
      <div className="animate-slide-in-up relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-[var(--shadow-overlay)] sm:my-auto sm:rounded-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="bg-destructive/10 text-destructive mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-foreground text-base font-bold">{title}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{body}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="press-scale border-border font-display text-foreground hover:bg-muted rounded-md border bg-white px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <form action={action}>
            <input type="hidden" name="id" value={clipId} />
            <button
              type="submit"
              disabled={pending}
              className="press-scale bg-destructive font-display text-destructive-foreground rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={() => {
                // Close on next tick so the form submission goes through;
                // the parent's state.ok would normally re-render the row.
                setTimeout(() => onCancel(), 50);
              }}
            >
              {pending ? 'Action en cours…' : cta}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

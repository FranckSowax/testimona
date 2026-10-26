'use client';

import { Link } from '@/i18n/navigation';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  validateClipAction,
  unvalidateClipAction,
  regenerateClipAction,
  deleteOwnClipAction,
  type ClipActionState,
} from './actions';

interface Props {
  clipId: string;
  validated: boolean;
  failed?: boolean;
}

export function ClipActions({ clipId, validated, failed }: Props) {
  const t = useTranslations('dashboard.clips');
  const [valState, valAction, valPending] = useActionState<ClipActionState | null, FormData>(
    validated ? unvalidateClipAction : validateClipAction,
    null,
  );
  const [regenState, regenAction, regenPending] = useActionState<ClipActionState | null, FormData>(
    regenerateClipAction,
    null,
  );
  const [, delAction, delPending] = useActionState<ClipActionState | null, FormData>(
    deleteOwnClipAction,
    null,
  );

  const insufficient = regenState?.needsCredits != null;
  const showError = valState?.error || (regenState?.error && !insufficient);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {!failed && (
          <form action={valAction} className="flex-1">
            <input type="hidden" name="id" value={clipId} />
            <button
              type="submit"
              disabled={valPending}
              className={[
                'press-scale font-display w-full rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50',
                validated
                  ? 'border-border text-foreground hover:bg-muted border bg-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              ].join(' ')}
            >
              {valPending ? '…' : validated ? t('cancel') : t('validate')}
            </button>
          </form>
        )}

        <form action={regenAction} className="flex-1">
          <input type="hidden" name="id" value={clipId} />
          <button
            type="submit"
            disabled={regenPending}
            aria-label={t('regenAria')}
            className="press-scale border-accent/40 bg-accent/5 font-display text-accent hover:bg-accent/10 flex w-full items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
          >
            <svg
              width="11"
              height="11"
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
            {regenPending ? '…' : t('regenLabel')}
          </button>
        </form>

        <form action={delAction}>
          <input type="hidden" name="id" value={clipId} />
          <button
            type="submit"
            disabled={delPending}
            aria-label={t('deleteAria')}
            className="press-scale border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-50"
          >
            <svg
              width="13"
              height="13"
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
      </div>
      {insufficient && (
        <Link
          href="/dashboard/profile/credits"
          className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 block rounded-md border px-2.5 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide"
        >
          {t('insufficientBalance')}
        </Link>
      )}
      {showError && (
        <p role="alert" className="text-destructive text-[11px]">
          {valState?.error || regenState?.error}
        </p>
      )}
    </div>
  );
}

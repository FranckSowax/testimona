'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipActions } from './ClipActions';

export interface ClipRowDto {
  id: string;
  memorialId: string;
  memorialSlug: string;
  memorialName: string;
  photoUrl: string;
  caption: string | null;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  creditCost: number;
  createdAt: string;
  validatedAt: string | null;
}

const STATUS: Record<
  string,
  { label: string; tone: 'pending' | 'processing' | 'ready' | 'failed' }
> = {
  pending: { label: 'En attente', tone: 'pending' },
  processing: { label: 'Génération…', tone: 'processing' },
  ready: { label: 'Prêt', tone: 'ready' },
  failed: { label: 'Échoué', tone: 'failed' },
};

const TONE_CLS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-primary/10 text-primary',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-destructive/10 text-destructive',
};

export function ClipsList({ clips }: { clips: ClipRowDto[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const hasActive = clips.some(
    (c) => c.status === 'pending' || c.status === 'processing',
  );

  useEffect(() => {
    cancelledRef.current = false;
    if (!hasActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    const tick = async () => {
      try {
        await fetch('/api/clips/poll', { method: 'POST' });
      } catch {
        /* ignore */
      }
      if (!cancelledRef.current) {
        startTransition(() => router.refresh());
      }
    };
    intervalRef.current = setInterval(tick, 12_000);
    void tick();
    return () => {
      cancelledRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [hasActive, router]);

  if (clips.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-12 text-center text-sm italic text-muted-foreground">
        Tu n'as pas encore généré de clip. Ouvre un mémorial et clique sur le
        bouton « + » dans la barre du cover pour démarrer.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {clips.map((clip) => {
        const status = STATUS[clip.status] ?? {
          label: clip.status,
          tone: 'pending' as const,
        };
        const validated = !!clip.validatedAt;
        return (
          <li
            key={clip.id}
            className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)]"
          >
            <div className="relative aspect-video w-full bg-muted">
              {clip.status === 'ready' && clip.videoUrl ? (
                <video
                  src={clip.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : clip.photoUrl ? (
                <Image
                  src={clip.photoUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover opacity-60"
                />
              ) : null}
              {clip.status !== 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                  {clip.status === 'processing' || clip.status === 'pending' ? (
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  ) : (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </div>
              )}
              {validated && clip.status === 'ready' && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white shadow">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Validé
                </span>
              )}
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/memorial/${clip.memorialSlug}`}
                  className="truncate font-display text-sm font-bold text-foreground hover:text-primary"
                >
                  {clip.memorialName}
                </Link>
                <span
                  className={[
                    'inline-flex shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider',
                    TONE_CLS[status.tone] ?? '',
                  ].join(' ')}
                >
                  {status.label}
                </span>
              </div>
              {clip.caption && (
                <p className="line-clamp-2 text-xs italic text-muted-foreground">
                  {clip.caption}
                </p>
              )}
              {clip.errorMessage && (
                <p className="text-xs text-destructive">
                  {clip.errorMessage}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {new Date(clip.createdAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              {clip.status === 'ready' && (
                <ClipActions clipId={clip.id} validated={validated} />
              )}
              {clip.status === 'failed' && (
                <ClipActions clipId={clip.id} validated={false} failed />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

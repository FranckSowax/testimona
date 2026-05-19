'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export interface StoryPhoto {
  id: string;
  url: string;
  caption?: string | null;
}

type Filter = 'none' | 'bw' | 'sepia';

interface Props {
  open: boolean;
  onClose: () => void;
  photos: StoryPhoto[];
  memorialName: string;
  durationMs?: number; // per-slide duration
  labels: {
    aria: string;
    close: string;
    prev: string;
    next: string;
    play: string;
    pause: string;
    filterNone: string;
    filterBw: string;
    filterSepia: string;
    kenBurns: string;
    empty: string;
    speed: string;
    speedSlow: string;
    speedMedium: string;
    speedFast: string;
  };
}

const FILTER_CSS: Record<Filter, string> = {
  none: 'none',
  bw: 'grayscale(1) contrast(1.05)',
  sepia: 'sepia(0.85) saturate(1.2)',
};

const SPEEDS = { slow: 8000, medium: 5000, fast: 3000 } as const;

/**
 * Full-screen Instagram-story-style slideshow of a memorial's photos.
 * - Auto-advance with progress bars at the top
 * - Tap left half = previous, right half = next, middle = pause
 * - Filter toggle (none / B&W / sepia)
 * - Ken Burns subtle zoom (respects prefers-reduced-motion)
 * - Speed picker (slow/medium/fast)
 * - Closes on Escape, scrim click, or X button
 */
export function PhotoStoryViewer({
  open,
  onClose,
  photos,
  memorialName,
  durationMs,
  labels,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [kenBurns, setKenBurns] = useState(true);
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('medium');
  const slideDuration = durationMs ?? SPEEDS[speed];

  const total = photos.length;
  const current = photos[index];
  const startedAtRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0); // 0..1

  // Reset on open / index change
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setPaused(false);
    elapsedRef.current = 0;
    setProgress(0);
    startedAtRef.current = Date.now();
  }, [open]);

  // Body scroll lock + escape close
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-advance loop
  useEffect(() => {
    if (!open || total === 0) return;
    elapsedRef.current = 0;
    setProgress(0);
    startedAtRef.current = Date.now();
    let raf: number;

    function tick() {
      if (!paused) {
        const now = Date.now();
        elapsedRef.current += now - startedAtRef.current;
        startedAtRef.current = now;
        const ratio = Math.min(1, elapsedRef.current / slideDuration);
        setProgress(ratio);
        if (ratio >= 1) {
          goNext();
          return;
        }
      } else {
        startedAtRef.current = Date.now();
      }
      raf = requestAnimationFrame(tick);
      animationRef.current = raf;
    }
    raf = requestAnimationFrame(tick);
    animationRef.current = raf;
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, paused, slideDuration, total]);

  function goNext() {
    setIndex((i) => {
      if (i + 1 >= total) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }
  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      goPrev();
    } else if (x > 2 * third) {
      goNext();
    } else {
      setPaused((p) => !p);
    }
  }

  if (!open) return null;
  if (total === 0) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.aria}
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/95 text-white"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <p className="px-6 text-center text-sm italic text-white/70">{labels.empty}</p>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.aria}
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-black text-white"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3">
        {photos.map((_, i) => (
          <span
            key={i}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20"
          >
            <span
              className="absolute inset-y-0 left-0 bg-white"
              style={{
                width:
                  i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                transition: i === index ? 'none' : 'width 0.15s linear',
              }}
            />
          </span>
        ))}
      </div>

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 pb-3 pt-8 sm:px-6">
        <p className="truncate font-display text-sm font-bold">{memorialName}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>

      {/* Slide */}
      <div
        onClick={handleTap}
        className="relative flex flex-1 cursor-pointer items-center justify-center select-none overflow-hidden"
      >
        {current && (
          <Image
            src={current.url}
            alt={current.caption ?? ''}
            fill
            sizes="100vw"
            priority
            className={[
              'object-contain',
              kenBurns ? 'animate-ken-burns motion-reduce:animate-none' : '',
            ].join(' ')}
            style={{ filter: FILTER_CSS[filter] }}
          />
        )}

        {/* Caption */}
        {current?.caption && (
          <p className="absolute bottom-28 left-1/2 max-w-[80vw] -translate-x-1/2 rounded-md bg-black/40 px-4 py-2 text-center text-sm backdrop-blur-sm">
            {current.caption}
          </p>
        )}

        {/* Paused indicator */}
        {paused && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 mx-auto flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </span>
        )}
      </div>

      {/* Controls bar */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black to-transparent px-4 pb-6 pt-12 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? labels.play : labels.pause}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          >
            {paused ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            )}
          </button>

          <FilterPill
            label={labels.filterNone}
            active={filter === 'none'}
            onClick={() => setFilter('none')}
          />
          <FilterPill
            label={labels.filterBw}
            active={filter === 'bw'}
            onClick={() => setFilter('bw')}
          />
          <FilterPill
            label={labels.filterSepia}
            active={filter === 'sepia'}
            onClick={() => setFilter('sepia')}
          />
          <FilterPill
            label={labels.kenBurns}
            active={kenBurns}
            onClick={() => setKenBurns((v) => !v)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-display text-[11px] font-bold uppercase tracking-wide text-white/60 sm:inline">
            {labels.speed}
          </span>
          {(['slow', 'medium', 'fast'] as const).map((s) => (
            <FilterPill
              key={s}
              label={
                s === 'slow' ? labels.speedSlow : s === 'medium' ? labels.speedMedium : labels.speedFast
              }
              active={speed === s}
              onClick={() => setSpeed(s)}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wide transition-colors',
        active
          ? 'bg-white text-foreground'
          : 'bg-white/15 text-white hover:bg-white/25',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

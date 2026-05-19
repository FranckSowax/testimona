'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface StoryPhoto {
  id: string;
  url: string;
  caption?: string | null;
  durationMs?: number | null;
}

type Filter = 'none' | 'bw' | 'sepia';
type Transition = 'fade' | 'swipe';

interface MusicSource {
  kind: 'youtube' | 'audio';
  src: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  photos: StoryPhoto[];
  memorialName: string;
  musicUrl?: string | null;
  durationMs?: number;
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
    vignette: string;
    bokeh: string;
    swipe: string;
    fade: string;
    musicOn: string;
    musicOff: string;
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

function parseMusicUrl(input: string | null | undefined): MusicSource | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const yt =
    trimmed.match(/youtu\.be\/([\w-]{6,})/) ||
    trimmed.match(/youtube\.com\/(?:watch\?v=|shorts\/|embed\/)([\w-]{6,})/);
  if (yt && yt[1]) return { kind: 'youtube', src: yt[1] };
  if (
    /\.(mp3|m4a|ogg|wav|aac|opus)(\?|$)/i.test(trimmed) ||
    /supabase\.(co|in)\/storage/.test(trimmed)
  ) {
    return { kind: 'audio', src: trimmed };
  }
  return { kind: 'audio', src: trimmed };
}

export function PhotoStoryViewer({
  open,
  onClose,
  photos,
  memorialName,
  musicUrl,
  durationMs,
  labels,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [kenBurns, setKenBurns] = useState(true);
  const [vignette, setVignette] = useState(true);
  const [bokeh, setBokeh] = useState(false);
  const [transition, setTransition] = useState<Transition>('swipe');
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('medium');
  const [musicMuted, setMusicMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const music = parseMusicUrl(musicUrl);
  const total = photos.length;
  const current = photos[index];
  const currentDuration =
    current?.durationMs && current.durationMs > 0
      ? current.durationMs
      : (durationMs ?? SPEEDS[speed]);

  const startedAtRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setPaused(false);
    elapsedRef.current = 0;
    setProgress(0);
    startedAtRef.current = Date.now();
  }, [open]);

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

  useEffect(() => {
    if (!open || total === 0) return;
    elapsedRef.current = 0;
    setProgress(0);
    startedAtRef.current = Date.now();
    let raf: number;
    const duration = currentDuration;

    function tick() {
      if (!paused) {
        const now = Date.now();
        elapsedRef.current += now - startedAtRef.current;
        startedAtRef.current = now;
        const ratio = Math.min(1, elapsedRef.current / duration);
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
  }, [open, index, paused, currentDuration, total]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = musicMuted;
    if (open && !paused) {
      void a.play().catch(() => {
        /* user gesture missing; retry on next interaction */
      });
    } else {
      a.pause();
    }
  }, [open, paused, musicMuted]);

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
    if (x < third) goPrev();
    else if (x > 2 * third) goNext();
    else setPaused((p) => !p);
  }

  if (!open || !mounted) return null;

  if (total === 0) {
    return createPortal(
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
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.aria}
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col overflow-hidden bg-black text-white"
    >
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

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 pb-3 pt-8 sm:px-6">
        <p className="truncate font-display text-sm font-bold">{memorialName}</p>
        <div className="flex items-center gap-2">
          {music && (
            <button
              type="button"
              onClick={() => setMusicMuted((m) => !m)}
              aria-label={musicMuted ? labels.musicOn : labels.musicOff}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {musicMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          )}
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
        </div>
      </header>

      <div
        onClick={handleTap}
        className="relative flex flex-1 cursor-pointer items-center justify-center select-none overflow-hidden"
      >
        {transition === 'swipe' ? (
          <div
            className="flex h-full w-full"
            style={{
              transform: `translateX(-${index * 100}%)`,
              transition: 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
          >
            {photos.map((photo, i) => (
              <SlideImage
                key={photo.id}
                photo={photo}
                active={i === index}
                filter={filter}
                kenBurns={kenBurns}
                bokeh={bokeh}
              />
            ))}
          </div>
        ) : current ? (
          <SlideImage
            key={current.id}
            photo={current}
            active
            filter={filter}
            kenBurns={kenBurns}
            bokeh={bokeh}
            crossFade
          />
        ) : null}

        {vignette && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
            }}
          />
        )}

        {current?.caption && (
          <p className="absolute bottom-28 left-1/2 z-10 max-w-[80vw] -translate-x-1/2 rounded-md bg-black/40 px-4 py-2 text-center text-sm backdrop-blur-sm">
            {current.caption}
          </p>
        )}

        {paused && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 mx-auto z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </span>
        )}
      </div>

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
          <Pill label={labels.filterNone} active={filter === 'none'} onClick={() => setFilter('none')} />
          <Pill label={labels.filterBw} active={filter === 'bw'} onClick={() => setFilter('bw')} />
          <Pill label={labels.filterSepia} active={filter === 'sepia'} onClick={() => setFilter('sepia')} />
          <Pill label={labels.kenBurns} active={kenBurns} onClick={() => setKenBurns((v) => !v)} />
          <Pill label={labels.vignette} active={vignette} onClick={() => setVignette((v) => !v)} />
          <Pill label={labels.bokeh} active={bokeh} onClick={() => setBokeh((v) => !v)} />
          <Pill
            label={transition === 'swipe' ? labels.swipe : labels.fade}
            active
            onClick={() => setTransition((t) => (t === 'swipe' ? 'fade' : 'swipe'))}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-display text-[11px] font-bold uppercase tracking-wide text-white/60 sm:inline">
            {labels.speed}
          </span>
          {(['slow', 'medium', 'fast'] as const).map((s) => (
            <Pill
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

      {music?.kind === 'youtube' && !musicMuted && (
        <iframe
          src={`https://www.youtube.com/embed/${music.src}?autoplay=1&controls=0&loop=1&playlist=${music.src}`}
          allow="autoplay"
          title="Ambient music"
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 h-0 w-0 opacity-0"
        />
      )}
      {music?.kind === 'audio' && (
        <audio ref={audioRef} src={music.src} loop preload="auto" className="hidden" />
      )}
    </div>,
    document.body,
  );
}

function SlideImage({
  photo,
  active,
  filter,
  kenBurns,
  bokeh,
  crossFade,
}: {
  photo: StoryPhoto;
  active: boolean;
  filter: Filter;
  kenBurns: boolean;
  bokeh: boolean;
  crossFade?: boolean;
}) {
  return (
    <div className="relative h-full w-full shrink-0">
      {bokeh && (
        <div className="absolute inset-0">
          <Image
            src={photo.url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover blur-2xl scale-110 opacity-70"
            aria-hidden="true"
          />
        </div>
      )}
      <Image
        src={photo.url}
        alt={photo.caption ?? ''}
        fill
        sizes="100vw"
        priority={active}
        className={[
          'relative object-contain',
          kenBurns && active ? 'animate-ken-burns motion-reduce:animate-none' : '',
          crossFade ? 'animate-fade-in motion-reduce:animate-none' : '',
        ].join(' ')}
        style={{ filter: FILTER_CSS[filter] }}
      />
    </div>
  );
}

function Pill({
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
        active ? 'bg-white text-foreground' : 'bg-white/15 text-white hover:bg-white/25',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

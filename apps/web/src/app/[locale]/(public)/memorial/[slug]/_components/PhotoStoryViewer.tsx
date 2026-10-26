'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

export interface StoryPhoto {
  id: string;
  url: string;
  caption?: string | null;
  durationMs?: number | null;
  /** Optional Higgsfield-generated MP4 — when set, plays as video instead of static image. */
  videoUrl?: string | null;
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
  const t = useTranslations('memorial.coverSidebar.story');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [kenBurns, setKenBurns] = useState(true);
  const [vignette, setVignette] = useState(true);
  const [bokeh, setBokeh] = useState(false);
  const [transition, setTransition] = useState<Transition>('swipe');
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('medium');
  const [musicMuted, setMusicMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 p-3">
        {photos.map((_, i) => (
          <span key={i} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <span
              className="absolute inset-y-0 left-0 bg-white"
              style={{
                width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                transition: i === index ? 'none' : 'width 0.15s linear',
              }}
            />
          </span>
        ))}
      </div>

      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pb-3 pt-8 sm:px-6">
        <p className="font-display truncate text-sm font-bold">{memorialName}</p>
        <div className="flex items-center gap-2">
          {music && (
            <button
              type="button"
              onClick={() => setMusicMuted((m) => !m)}
              aria-label={musicMuted ? labels.musicOn : labels.musicOff}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {musicMuted ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
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
        className="relative flex flex-1 cursor-pointer select-none items-center justify-center overflow-hidden"
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

        {current?.caption &&
          (current.videoUrl ? (
            <p
              className="animate-fade-in-up absolute bottom-28 left-1/2 z-10 max-w-[88vw] -translate-x-1/2 px-4 text-center text-3xl leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] motion-reduce:animate-none sm:max-w-[70vw] sm:text-5xl"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              {current.caption}
            </p>
          ) : (
            <p className="absolute bottom-28 left-1/2 z-10 max-w-[80vw] -translate-x-1/2 rounded-md bg-black/40 px-4 py-2 text-center text-sm backdrop-blur-sm">
              {current.caption}
            </p>
          ))}

        {paused && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 z-10 mx-auto flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </span>
        )}
      </div>

      {/* Compact glass control bar — always visible */}
      <footer className="relative z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-10">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-2 shadow-[var(--shadow-overlay)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? labels.play : labels.pause}
            className="press-scale text-foreground inline-flex h-11 w-11 items-center justify-center rounded-full bg-white transition-transform hover:scale-105"
          >
            {paused ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-label={t('settings')}
            className="font-display flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/90 transition-colors hover:bg-white/10"
          >
            <span className="truncate">
              {filter === 'bw'
                ? labels.filterBw
                : filter === 'sepia'
                  ? labels.filterSepia
                  : labels.filterNone}
            </span>
            <span aria-hidden="true" className="text-white/40">
              ·
            </span>
            <span className="text-white/70">
              {speed === 'slow'
                ? labels.speedSlow
                : speed === 'fast'
                  ? labels.speedFast
                  : labels.speedMedium}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings')}
            className="press-scale inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Settings bottom sheet */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('settingsDialog')}
          className="absolute inset-0 z-30 flex items-end"
        >
          <button
            type="button"
            aria-label={t('closeSettings')}
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="animate-slide-in-up relative z-10 w-full rounded-t-3xl border-t border-white/15 bg-[rgba(20,20,28,0.85)] px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 shadow-[var(--shadow-overlay)] backdrop-blur-2xl">
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" aria-hidden="true" />

            <div className="space-y-5">
              <Section title={t('filterTitle')}>
                <SegPill
                  label={labels.filterNone}
                  active={filter === 'none'}
                  onClick={() => setFilter('none')}
                />
                <SegPill
                  label={labels.filterBw}
                  active={filter === 'bw'}
                  onClick={() => setFilter('bw')}
                />
                <SegPill
                  label={labels.filterSepia}
                  active={filter === 'sepia'}
                  onClick={() => setFilter('sepia')}
                />
              </Section>

              <Section title={t('effectsTitle')}>
                <ToggleChip
                  label={labels.kenBurns}
                  active={kenBurns}
                  onClick={() => setKenBurns((v) => !v)}
                />
                <ToggleChip
                  label={labels.vignette}
                  active={vignette}
                  onClick={() => setVignette((v) => !v)}
                />
                <ToggleChip
                  label={labels.bokeh}
                  active={bokeh}
                  onClick={() => setBokeh((v) => !v)}
                />
              </Section>

              <Section title={t('transitionTitle')}>
                <SegPill
                  label={labels.swipe}
                  active={transition === 'swipe'}
                  onClick={() => setTransition('swipe')}
                />
                <SegPill
                  label={labels.fade}
                  active={transition === 'fade'}
                  onClick={() => setTransition('fade')}
                />
              </Section>

              <Section title={labels.speed}>
                {(['slow', 'medium', 'fast'] as const).map((s) => (
                  <SegPill
                    key={s}
                    label={
                      s === 'slow'
                        ? labels.speedSlow
                        : s === 'medium'
                          ? labels.speedMedium
                          : labels.speedFast
                    }
                    active={speed === s}
                    onClick={() => setSpeed(s)}
                  />
                ))}
              </Section>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="press-scale font-display text-foreground mt-6 block w-full rounded-full bg-white py-3 text-sm font-bold uppercase tracking-wide transition-opacity hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}

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
            className="scale-110 object-cover opacity-70 blur-2xl"
            aria-hidden="true"
          />
        </div>
      )}
      {photo.videoUrl ? (
        <video
          src={photo.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          poster={photo.url}
          className={[
            'relative h-full w-full object-contain',
            crossFade ? 'animate-fade-in motion-reduce:animate-none' : '',
          ].join(' ')}
          style={{ filter: FILTER_CSS[filter] }}
        />
      ) : (
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
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SegPill({
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
        'press-scale font-display rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-150',
        active
          ? 'text-foreground bg-white shadow-lg shadow-white/20'
          : 'bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/15 hover:text-white',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ToggleChip({
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
        'press-scale font-display inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-150',
        active
          ? 'bg-[var(--color-primary)]/90 shadow-[var(--color-primary)]/30 text-white shadow-lg'
          : 'bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/15 hover:text-white',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors',
          active ? 'bg-white text-[var(--color-primary)]' : 'bg-white/20',
        ].join(' ')}
      >
        {active && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

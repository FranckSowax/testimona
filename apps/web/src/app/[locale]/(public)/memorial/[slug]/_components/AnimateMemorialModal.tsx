'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  submitAnimationAction,
  type AnimateSelection,
} from '../_actions/animate';

export interface AnimatePhoto {
  id: string;
  url: string;
  caption: string | null;
}

export interface AnimateTestimonial {
  id: string;
  authorName: string;
  message: string;
}

interface Props {
  memorialId: string;
  memorialName: string;
  photos: AnimatePhoto[];
  testimonials: AnimateTestimonial[];
  initialBalance: number;
}

type Step = 1 | 2 | 3 | 'submitting' | 'done' | 'error';

interface SelState {
  picked: boolean;
  source: 'testimonial' | 'free';
  testimonialId?: string;
  caption: string;
}

export function AnimateMemorialModal({
  memorialId,
  memorialName,
  photos,
  testimonials,
  initialBalance,
}: Props) {
  const t = useTranslations('memorial.animate');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [sel, setSel] = useState<Record<string, SelState>>(() =>
    Object.fromEntries(
      photos.map((p) => [
        p.id,
        { picked: false, source: 'free' as const, caption: p.caption ?? '' },
      ]),
    ),
  );
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onOpen() {
      setStep(1);
      setError(null);
      setCreatedCount(0);
      setOpen(true);
    }
    window.addEventListener('testimona:open-animate', onOpen);
    return () => window.removeEventListener('testimona:open-animate', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'submitting') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, step]);

  const pickedIds = useMemo(
    () => Object.entries(sel).filter(([, v]) => v.picked).map(([k]) => k),
    [sel],
  );
  const cost = pickedIds.length;
  const sufficient = balance >= cost && cost > 0;

  function togglePick(photoId: string) {
    setSel((s) => {
      const cur = s[photoId];
      if (!cur) return s;
      return { ...s, [photoId]: { ...cur, picked: !cur.picked } };
    });
  }

  function setSource(photoId: string, source: 'testimonial' | 'free') {
    setSel((s) => {
      const cur = s[photoId];
      if (!cur) return s;
      return { ...s, [photoId]: { ...cur, source } };
    });
  }

  function setCaption(photoId: string, caption: string) {
    setSel((s) => {
      const cur = s[photoId];
      if (!cur) return s;
      return { ...s, [photoId]: { ...cur, caption } };
    });
  }

  function setTestimonial(photoId: string, id: string) {
    setSel((s) => {
      const cur = s[photoId];
      if (!cur) return s;
      const t = testimonials.find((x) => x.id === id);
      return {
        ...s,
        [photoId]: {
          ...cur,
          testimonialId: id,
          caption: t ? `« ${t.message.slice(0, 200)} » — ${t.authorName}` : '',
        },
      };
    });
  }

  function submit() {
    const selections: AnimateSelection[] = pickedIds.map((pid) => {
      const s = sel[pid]!;
      return {
        photoId: pid,
        captionSource: s.source,
        testimonialId: s.source === 'testimonial' ? s.testimonialId : undefined,
        caption: s.caption.trim(),
      };
    });
    setStep('submitting');
    setError(null);
    startTransition(async () => {
      const res = await submitAnimationAction(memorialId, selections);
      if (!res.ok) {
        setError(res.error ?? t('errorGeneric'));
        setStep('error');
        return;
      }
      setCreatedCount(res.createdClipIds?.length ?? 0);
      setBalance((b) => b - (res.createdClipIds?.length ?? 0));
      setStep('done');
    });
  }

  if (!open || !mounted) return null;

  const titleByStep: Record<Step, string> = {
    1: t('step1Title'),
    2: t('step2Title'),
    3: t('step3Title'),
    submitting: t('submittingTitle'),
    done: t('doneTitle'),
    error: t('errorTitle'),
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('ariaLabel')}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label={t('close')}
        onClick={() => step !== 'submitting' && setOpen(false)}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="animate-slide-in-up relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-[var(--shadow-overlay)] sm:my-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('subtitle')} · {memorialName}
            </p>
            <h2 className="truncate font-display text-lg font-bold text-foreground">
              {titleByStep[step]}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => step !== 'submitting' && setOpen(false)}
            aria-label={t('close')}
            disabled={step === 'submitting'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>

        {/* Stepper */}
        {(step === 1 || step === 2 || step === 3) && (
          <div className="flex items-center gap-2 px-5 pt-3">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={[
                  'h-1 flex-1 rounded-full',
                  n <= (step as number) ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <Step1Pick
              photos={photos}
              sel={sel}
              onToggle={togglePick}
            />
          )}
          {step === 2 && (
            <Step2Captions
              photos={photos}
              testimonials={testimonials}
              pickedIds={pickedIds}
              sel={sel}
              onSource={setSource}
              onCaption={setCaption}
              onTestimonial={setTestimonial}
            />
          )}
          {step === 3 && (
            <Step3Confirm
              pickedCount={pickedIds.length}
              cost={cost}
              balance={balance}
            />
          )}
          {step === 'submitting' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {t('submittingText')}
              </p>
            </div>
          )}
          {step === 'done' && (
            <div className="space-y-4 py-6 text-center">
              <p className="text-4xl">🎬</p>
              <p className="font-display text-lg font-bold text-foreground">
                {t('doneCount', { count: createdCount })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('doneHelp')}
              </p>
              <Link
                href="/dashboard/clips"
                className="press-scale inline-flex rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground"
              >
                {t('viewClips')}
              </Link>
            </div>
          )}
          {step === 'error' && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-3xl">⚠️</p>
              <p className="text-sm text-destructive">{error}</p>
              {error && error.includes('Solde insuffisant') && (
                <Link
                  href="/dashboard/profile/credits"
                  className="press-scale inline-flex rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground"
                >
                  {t('buyCredits')}
                </Link>
              )}
            </div>
          )}
        </div>

        {(step === 1 || step === 2 || step === 3) && (
          <footer className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-display font-bold text-foreground tabular">
                {cost}
              </span>{' '}
              {t('creditsWord', { count: cost })} · {t('balanceWord')}{' '}
              <span className="font-display font-bold text-foreground tabular">
                {balance}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {step !== 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => ((s as number) - 1) as Step)}
                  className="press-scale rounded-md border border-border bg-white px-3 py-2 font-display text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  {t('back')}
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  disabled={cost === 0}
                  onClick={() => setStep(2)}
                  className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {t('nextWithCount', { count: cost })}
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t('next')}
                </button>
              )}
              {step === 3 && (
                <>
                  {!sufficient && (
                    <Link
                      href="/dashboard/profile/credits"
                      className="press-scale rounded-md border-2 border-accent px-3 py-2 font-display text-sm font-bold text-accent hover:bg-accent/10"
                    >
                      {t('buy')}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!sufficient || isPending}
                    className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {t('start')}
                  </button>
                </>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Step1Pick({
  photos,
  sel,
  onToggle,
}: {
  photos: AnimatePhoto[];
  sel: Record<string, SelState>;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('memorial.animate');
  if (photos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted px-4 py-8 text-center text-sm italic text-muted-foreground">
        {t('noPhotos')}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('pickHint')}
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => {
          const picked = sel[p.id]?.picked ?? false;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={picked}
                className={[
                  'press-scale relative block w-full overflow-hidden rounded-md border-2 transition-all',
                  picked
                    ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]'
                    : 'border-border hover:border-primary/40',
                ].join(' ')}
              >
                <span className="relative block aspect-square">
                  <Image
                    src={p.url}
                    alt={p.caption ?? ''}
                    fill
                    sizes="(max-width: 640px) 33vw, 25vw"
                    className="object-cover"
                  />
                  {picked && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step2Captions({
  photos,
  testimonials,
  pickedIds,
  sel,
  onSource,
  onCaption,
  onTestimonial,
}: {
  photos: AnimatePhoto[];
  testimonials: AnimateTestimonial[];
  pickedIds: string[];
  sel: Record<string, SelState>;
  onSource: (id: string, src: 'testimonial' | 'free') => void;
  onCaption: (id: string, c: string) => void;
  onTestimonial: (id: string, tid: string) => void;
}) {
  const t = useTranslations('memorial.animate');
  const photoById = new Map(photos.map((p) => [p.id, p]));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('captionsHint')}
      </p>
      {pickedIds.map((pid) => {
        const p = photoById.get(pid);
        if (!p) return null;
        const state = sel[pid]!;
        return (
          <div
            key={pid}
            className="flex gap-3 rounded-lg border border-border bg-white p-3"
          >
            <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-md">
              <Image
                src={p.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex gap-1 rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => onSource(pid, 'testimonial')}
                  aria-pressed={state.source === 'testimonial'}
                  disabled={testimonials.length === 0}
                  className={[
                    'flex-1 rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50',
                    state.source === 'testimonial'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {t('sourceTestimonial')}
                </button>
                <button
                  type="button"
                  onClick={() => onSource(pid, 'free')}
                  aria-pressed={state.source === 'free'}
                  className={[
                    'flex-1 rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition-colors',
                    state.source === 'free'
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {t('sourceFree')}
                </button>
              </div>

              {state.source === 'testimonial' ? (
                testimonials.length === 0 ? (
                  <p className="rounded-md bg-muted px-2 py-1.5 text-xs italic text-muted-foreground">
                    {t('noTestimonials')}
                  </p>
                ) : (
                  <select
                    value={state.testimonialId ?? ''}
                    onChange={(e) => onTestimonial(pid, e.target.value)}
                    className="block w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
                  >
                    <option value="">{t('chooseTestimonial')}</option>
                    {testimonials.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.authorName} — {t.message.slice(0, 50)}…
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <textarea
                  value={state.caption}
                  onChange={(e) => onCaption(pid, e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder={t('captionPlaceholder')}
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Step3Confirm({
  pickedCount,
  cost,
  balance,
}: {
  pickedCount: number;
  cost: number;
  balance: number;
}) {
  const t = useTranslations('memorial.animate');
  const after = balance - cost;
  const insufficient = balance < cost;
  return (
    <div className="space-y-4 py-3">
      <div className="rounded-xl border border-border bg-surface/40 p-5">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('summary')}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-foreground">{t('summaryAnimations')}</span>
            <span className="tabular font-display font-bold text-foreground">
              {pickedCount}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-foreground">{t('summaryDuration')}</span>
            <span className="font-display font-bold text-foreground">5-7 s</span>
          </li>
          <li className="flex justify-between border-t border-border pt-2">
            <span className="text-foreground">{t('summaryTotalCost')}</span>
            <span className="tabular font-display text-lg font-bold text-foreground">
              {t('creditsCount', { count: cost })}
            </span>
          </li>
        </ul>
      </div>
      <div
        className={[
          'rounded-xl border p-4',
          insufficient
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-primary/30 bg-primary/5',
        ].join(' ')}
      >
        <p className="flex justify-between text-sm">
          <span className="text-foreground">{t('currentBalance')}</span>
          <span className="tabular font-display font-bold text-foreground">
            {balance}
          </span>
        </p>
        <p className="mt-1 flex justify-between text-sm">
          <span className="text-foreground">{t('balanceAfter')}</span>
          <span
            className={[
              'tabular font-display font-bold',
              insufficient ? 'text-destructive' : 'text-primary',
            ].join(' ')}
          >
            {after}
          </span>
        </p>
        {insufficient && (
          <p className="mt-2 text-xs text-destructive">
            {t('missingCredits', { count: cost - balance })}
          </p>
        )}
      </div>
    </div>
  );
}

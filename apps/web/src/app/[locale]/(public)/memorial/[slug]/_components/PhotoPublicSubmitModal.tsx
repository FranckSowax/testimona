'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { submitPublicPhotoAction, type PhotoActionState } from '../photo-actions';

interface Props {
  memorialId: string;
  slug: string;
  memorialName: string;
  /** Pre-filled when the visitor is logged-in. */
  prefillName?: string;
  prefillEmail?: string;
}

/**
 * Open-to-anyone photo submission modal. Triggered by a button under
 * the photo grid on the public memorial. Uploads the file directly,
 * captures submitter name + optional email + caption, and lands the
 * photo with status='pending' for owner moderation. Owner-uploaded
 * photos are auto-approved on the server side.
 */
export function PhotoPublicSubmitModal({
  memorialId,
  slug,
  memorialName,
  prefillName,
  prefillEmail,
}: Props) {
  const t = useTranslations('memorial.photoSubmit');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<PhotoActionState | null, FormData>(
    submitPublicPhotoAction,
    null,
  );
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => {
        formRef.current?.reset();
        setFilePreview(null);
        setOpen(false);
        router.refresh();
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isPending]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setFilePreview(null);
      return;
    }
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(f));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press-scale bg-primary font-display text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
      >
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
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2.5" />
          <path d="M21 17l-5-5-5 5" />
          <path d="M16 3v4M14 5h4" />
        </svg>
        {t('propose')}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('propose')}
            className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
          >
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => !isPending && setOpen(false)}
              className="bg-foreground/40 absolute inset-0 backdrop-blur-sm"
            />
            <div className="animate-slide-in-up relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-[var(--shadow-overlay)] sm:my-auto sm:rounded-2xl">
              <header className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <p className="font-display text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    {t('forMemorial', { name: memorialName })}
                  </p>
                  <h2 className="font-display text-foreground text-lg font-bold">{t('propose')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  aria-label={t('close')}
                  disabled={isPending}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </header>

              <form ref={formRef} action={formAction} className="flex-1 overflow-y-auto p-5">
                <input type="hidden" name="memorialId" value={memorialId} />
                <input type="hidden" name="slug" value={slug} />

                <label className="block">
                  <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {t('photoLabel')}
                  </span>
                  <div className="mt-1">
                    <input
                      name="file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={onFileChange}
                      className="text-foreground file:bg-primary file:font-display file:text-primary-foreground block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:tracking-wider hover:file:opacity-90"
                    />
                  </div>
                  {state?.fieldErrors?.file && (
                    <p className="text-destructive mt-1 text-xs">{state.fieldErrors.file}</p>
                  )}
                  <p className="text-muted-foreground mt-1 text-[11px]">{t('fileHint')}</p>
                </label>

                {filePreview && (
                  <div className="border-border mt-3 overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={filePreview}
                      alt={t('previewAlt')}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                )}

                <label className="mt-4 block">
                  <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {t('captionLabel')}
                  </span>
                  <textarea
                    name="caption"
                    rows={2}
                    maxLength={500}
                    placeholder={t('captionPlaceholder')}
                    className="border-border text-foreground focus:border-primary mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-base focus:outline-none sm:text-sm"
                  />
                </label>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      {t('nameLabel')}
                    </span>
                    <input
                      name="submitterName"
                      type="text"
                      required
                      maxLength={80}
                      defaultValue={prefillName ?? ''}
                      placeholder="Marie Dupont"
                      className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
                    />
                    {state?.fieldErrors?.submitterName && (
                      <p className="text-destructive mt-1 text-xs">
                        {state.fieldErrors.submitterName}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      {t('emailLabel')}{' '}
                      <span className="text-foreground/60 font-normal">{t('emailOptional')}</span>
                    </span>
                    <input
                      name="submitterEmail"
                      type="email"
                      maxLength={200}
                      defaultValue={prefillEmail ?? ''}
                      placeholder="marie@exemple.fr"
                      className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
                    />
                    {state?.fieldErrors?.submitterEmail && (
                      <p className="text-destructive mt-1 text-xs">
                        {state.fieldErrors.submitterEmail}
                      </p>
                    )}
                  </label>
                </div>

                {state?.error && state.error !== 'Validation' && (
                  <p
                    role="alert"
                    className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-md border px-3 py-2 text-sm"
                  >
                    {state.error}
                  </p>
                )}
                {state?.ok && (
                  <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    {t('successMessage')}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-[11px] italic">{t('moderationNote')}</p>
                  <button
                    type="submit"
                    disabled={isPending || !!state?.ok}
                    className="press-scale bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? t('sending') : state?.ok ? t('sent') : t('send')}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { reportTestimonialAction } from '../actions';

const REASON_KEYS = ['spam', 'offensive', 'personal', 'inaccurate', 'other'] as const;
type ReasonKey = (typeof REASON_KEYS)[number];

export function ReportDialog({
  testimonialId,
  open,
  onClose,
  onSubmitted,
}: {
  testimonialId: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const t = useTranslations('report');
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReasonKey>('spam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function reasonLabel(key: ReasonKey): string {
    switch (key) {
      case 'spam':
        return t('reasonSpam');
      case 'offensive':
        return t('reasonOffensive');
      case 'personal':
        return t('reasonPersonal');
      case 'inaccurate':
        return t('reasonInaccurate');
      case 'other':
        return t('reasonOther');
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (reason === 'other' && details.trim().length === 0) {
      setError(t('detailsLabel'));
      return;
    }
    const payload =
      details.trim().length > 0
        ? `${reasonLabel(reason)} — ${details.trim()}`
        : reasonLabel(reason);
    startTransition(async () => {
      const res = await reportTestimonialAction(testimonialId, payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      onSubmitted(t('submit'));
      setReason('spam');
      setDetails('');
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby="report-title"
      className="m-0 w-full max-w-md rounded-lg border border-border bg-white p-0 shadow-xl backdrop:bg-black/40 sm:m-auto"
    >
      <form onSubmit={handleSubmit} className="relative space-y-4 p-6">
        <button
          type="button"
          aria-label={t('close')}
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div>
          <h2 id="report-title" className="font-display text-xl font-semibold text-foreground">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{t('reasonLegend')}</legend>
          {REASON_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm hover:bg-surface"
            >
              <input
                type="radio"
                name="reason"
                value={key}
                checked={reason === key}
                onChange={() => setReason(key)}
                className="text-primary"
              />
              <span>{reasonLabel(key)}</span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="report-details" className="block text-sm font-medium">
            {t('detailsLabel')}
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={500}
            required={reason === 'other'}
            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            {t('close')}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

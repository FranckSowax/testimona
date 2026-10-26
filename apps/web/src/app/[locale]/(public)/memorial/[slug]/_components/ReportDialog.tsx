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
      className="border-border m-0 w-full max-w-md rounded-lg border bg-white p-0 shadow-xl backdrop:bg-black/40 sm:m-auto"
    >
      <form onSubmit={handleSubmit} className="relative space-y-4 p-6">
        <button
          type="button"
          aria-label={t('close')}
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary absolute right-3 top-3 rounded-md p-1.5 focus:outline-none focus-visible:ring-2"
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
          <h2 id="report-title" className="font-display text-foreground text-xl font-semibold">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-foreground text-sm font-medium">{t('reasonLegend')}</legend>
          {REASON_KEYS.map((key) => (
            <label
              key={key}
              className="border-border hover:bg-surface flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
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
            className="border-border focus:border-primary focus:ring-primary mt-1 w-full rounded-md border bg-white px-3 py-2 text-base focus:outline-none focus:ring-1 sm:text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
          >
            {t('close')}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

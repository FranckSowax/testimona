'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard, PopupHeader } from '@/components/popups/PopupCard';
import { updateDonationSettingsAction } from '../_actions/admin';

interface Props {
  memorialId: string;
  slug: string;
  initialGoalEuros: number;
  initialCurrency: string;
  initialAbout: string;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'XAF', 'CAD'];

/**
 * Owner control to edit the fundraising goal + the "About the donation"
 * message (PDF p29, D3/D4). Pencil button → popup form.
 */
export function DonationSettingsModalShell({
  memorialId,
  slug,
  initialGoalEuros,
  initialCurrency,
  initialAbout,
}: Props) {
  const t = useTranslations('memorial.donationSettings');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState(String(initialGoalEuros || ''));
  const [currency, setCurrency] = useState(initialCurrency || 'EUR');
  const [about, setAbout] = useState(initialAbout ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('memorialId', memorialId);
      fd.set('slug', slug);
      fd.set('goalEuros', goal || '0');
      fd.set('currency', currency);
      fd.set('about', about);
      const result = await updateDonationSettingsAction(null, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('editAria')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--color-bg-hover-gray)] hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      <PopupCard open={open} onClose={() => setOpen(false)} ariaLabel={t('editAria')} width="lg">
        <div className="space-y-5">
          <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block font-display text-sm font-medium text-muted-foreground">
                  {t('goalLabel')}
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="600"
                  className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block font-display text-sm font-medium text-muted-foreground">
                  {t('currencyLabel')}
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="block font-display text-sm font-medium text-muted-foreground">
                {t('aboutLabel')}
              </span>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder={t('aboutPlaceholder')}
                className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
              />
              <span className="mt-1 block text-right text-xs italic text-muted-foreground">
                {about.length}/1000
              </span>
            </label>

            {error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={() => setOpen(false)}>
                {t('cancel')}
              </ButtonOutlined>
              <ButtonOutlined type="submit" variant="popup-rose" size="md" loading={pending}>
                {t('save')}
              </ButtonOutlined>
            </div>
          </form>
        </div>
      </PopupCard>
    </>
  );
}

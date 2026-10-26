'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard, PopupHeader } from './PopupCard';

export interface DonationFormValues {
  amountCents: number;
  currency: string;
  donorName: string;
  message: string;
  /** Donor's real name is still recorded for the family; this only hides it publicly. */
  isAnonymous: boolean;
}

interface MyDonationCreateModalProps {
  /** Memorial's currency (admin setting) — preselected for the donor. */
  defaultCurrency?: string;
  open: boolean;
  onClose: () => void;
  memorialName: string;
  memorialCoverUrl?: string | null;
  donorAvatarUrl?: string | null;
  donorName?: string;
  useEmbeddedPaypal?: boolean;
  onSubmit: (values: DonationFormValues) => Promise<void> | void;
  submitting?: boolean;
}

const PRESETS = [10, 15, 20, 50, 100];
const CURRENCIES = ['EUR', 'USD', 'CAD', 'GBP'];

/**
 * V2 popup "My Donation — Create a new" (PDF p16-18-36).
 */
export function MyDonationCreateModal({
  defaultCurrency,
  open,
  onClose,
  memorialName,
  memorialCoverUrl,
  donorAvatarUrl,
  donorName,
  useEmbeddedPaypal = false,
  onSubmit,
  submitting = false,
}: MyDonationCreateModalProps) {
  const t = useTranslations('popups.donationCreate');
  const [currency, setCurrency] = useState(defaultCurrency ?? 'EUR');
  const [presetAmount, setPresetAmount] = useState<number | 'other' | null>(20);
  const [otherAmount, setOtherAmount] = useState('');
  const [name, setName] = useState(donorName ?? '');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const finalAmount =
    presetAmount === 'other' ? Number.parseFloat(otherAmount) || 0 : (presetAmount ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (finalAmount <= 0 || submitting) return;
    await onSubmit({
      amountCents: Math.round(finalAmount * 100),
      currency,
      donorName: name.trim(),
      message: message.trim(),
      isAnonymous,
    });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel={t('ariaLabel')} width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />

        <div className="flex items-center justify-center gap-3">
          <Avatar src={memorialCoverUrl} name={memorialName} size="md" border="rose" />
          <p className="font-display text-foreground text-sm font-bold">{memorialName}</p>
        </div>

        <div className="flex justify-center">
          <Avatar src={donorAvatarUrl} name={donorName} size="md" />
        </div>

        <p className="text-muted-foreground text-center text-sm leading-relaxed">
          {t('flowersFade')}{' '}
          <span className="font-display text-foreground font-bold">{memorialName}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              {t('nameLabel')}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t('namePlaceholder')}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              {t('messageLabel')}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              {t('currencyLabel')}
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="font-display text-muted-foreground block text-sm font-medium">
              {t('amountLegend')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((amount) => {
                const active = presetAmount === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setPresetAmount(amount)}
                    aria-pressed={active}
                    className={[
                      'press-scale font-display rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors',
                      active
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-accent/40 text-accent hover:bg-[var(--color-bg-hover-pink)]',
                    ].join(' ')}
                  >
                    {amount}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPresetAmount('other')}
                aria-pressed={presetAmount === 'other'}
                className={[
                  'press-scale font-display rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors',
                  presetAmount === 'other'
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-accent/40 text-accent hover:bg-[var(--color-bg-hover-pink)]',
                ].join(' ')}
              >
                {t('otherAmount')}
              </button>
            </div>
            {presetAmount === 'other' && (
              <input
                type="number"
                min="1"
                step="0.01"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                placeholder={t('enterAmount')}
                required
                className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-2 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
              />
            )}
          </fieldset>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="border-border accent-primary mt-0.5 h-5 w-5 cursor-pointer rounded border-2"
            />
            <span className="text-foreground">{t('hideOption')}</span>
          </label>

          {useEmbeddedPaypal && (
            <div
              aria-label="PayPal embed"
              className="border-border bg-surface rounded-md border border-dashed p-6 text-center"
              style={{ height: 340 }}
            >
              <p className="text-muted-foreground text-sm font-medium">{t('paypalPlaceholder')}</p>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={finalAmount <= 0}
            >
              {submitting ? t('sending') : t('submit')}
            </ButtonOutlined>
          </div>
        </form>

        <footer className="border-border text-muted-foreground border-t pt-3 text-center text-xs">
          {t('securePayment')}{' '}
          <span className="font-display text-foreground font-bold">
            PayPal · VISA · Mastercard · Amex · Discover
          </span>
        </footer>
      </div>
    </PopupCard>
  );
}

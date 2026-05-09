'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard, PopupHeader } from './PopupCard';

export interface DonationFormValues {
  amountCents: number;
  currency: string;
  message: string;
  hideFromEveryone: boolean;
}

interface MyDonationCreateModalProps {
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
  const [currency, setCurrency] = useState('EUR');
  const [presetAmount, setPresetAmount] = useState<number | 'other' | null>(20);
  const [otherAmount, setOtherAmount] = useState('');
  const [message, setMessage] = useState('');
  const [hide, setHide] = useState(false);

  const finalAmount =
    presetAmount === 'other' ? Number.parseFloat(otherAmount) || 0 : presetAmount ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (finalAmount <= 0 || submitting) return;
    await onSubmit({
      amountCents: Math.round(finalAmount * 100),
      currency,
      message: message.trim(),
      hideFromEveryone: hide,
    });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Create a donation" width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle="My Donation" subtitle="Create a new" />

        <div className="flex items-center justify-center gap-3">
          <Avatar src={memorialCoverUrl} name={memorialName} size="md" border="rose" />
          <p className="font-display text-sm font-bold text-foreground">{memorialName}</p>
        </div>

        <div className="flex justify-center">
          <Avatar src={donorAvatarUrl} name={donorName} size="md" />
        </div>

        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          Flowers fade over time, but your donation will surely help the close relatives of{' '}
          <span className="font-display font-bold text-foreground">{memorialName}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Add a message to be delivered with your donation
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Select the currency
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="block font-display text-sm font-medium text-muted-foreground">
              Amount of the donation
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
                      'press-scale rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold transition-colors',
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
                  'press-scale rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold transition-colors',
                  presetAmount === 'other'
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-accent/40 text-accent hover:bg-[var(--color-bg-hover-pink)]',
                ].join(' ')}
              >
                Other
              </button>
            </div>
            {presetAmount === 'other' && (
              <input
                type="number"
                min="1"
                step="0.01"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                placeholder="Enter the amount"
                required
                className="mt-2 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
            )}
          </fieldset>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={hide}
              onChange={(e) => setHide(e.target.checked)}
              className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-border accent-primary"
            />
            <span className="text-foreground">Hide my donation from everyone</span>
          </label>

          {useEmbeddedPaypal && (
            <div
              aria-label="PayPal embed"
              className="rounded-md border border-dashed border-border bg-surface p-6 text-center"
              style={{ height: 340 }}
            >
              <p className="text-sm font-medium text-muted-foreground">
                ÉCRAN PAYPAL ICI (placeholder dev)
              </p>
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
              {submitting ? 'Sending…' : 'Send donation'}
            </ButtonOutlined>
          </div>
        </form>

        <footer className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Secure payment via{' '}
          <span className="font-display font-bold text-foreground">
            PayPal · VISA · Mastercard · Amex · Discover
          </span>
        </footer>
      </div>
    </PopupCard>
  );
}

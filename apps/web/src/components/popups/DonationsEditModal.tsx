'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard, PopupHeader } from './PopupCard';

export interface DonationsEditValues {
  about: string;
  goalAmount: string;
  currency: string;
}

interface DonationsEditModalProps {
  open: boolean;
  onClose: () => void;
  memorialName: string;
  memorialCoverUrl?: string | null;
  initial?: Partial<DonationsEditValues>;
  onSubmit: (values: DonationsEditValues) => Promise<void> | void;
  submitting?: boolean;
}

const CURRENCIES = ['EUR', 'USD', 'CAD', 'GBP'];

/**
 * V2 popup "Donations — Edit info" (PDF p32).
 */
export function DonationsEditModal({
  open,
  onClose,
  memorialName,
  memorialCoverUrl,
  initial = {},
  onSubmit,
  submitting = false,
}: DonationsEditModalProps) {
  const [v, setV] = useState<DonationsEditValues>({
    about: initial.about ?? '',
    goalAmount: initial.goalAmount ?? '',
    currency: initial.currency ?? 'EUR',
  });
  const set = <K extends keyof DonationsEditValues>(k: K, val: DonationsEditValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !v.about.trim() || !v.goalAmount) return;
    await onSubmit(v);
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Edit donations info" width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle="Donations" subtitle="Edit info" />

        <div className="flex items-center justify-center gap-3">
          <Avatar src={memorialCoverUrl} name={memorialName} size="md" border="rose" />
          <p className="font-display text-sm font-bold text-foreground">{memorialName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              About the donations*
            </span>
            <textarea
              value={v.about}
              onChange={(e) => set('about', e.target.value)}
              required
              rows={6}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block font-display text-sm font-medium text-muted-foreground">
                Goal amount*
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={v.goalAmount}
                onChange={(e) => set('goalAmount', e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
            </label>
            <label className="block">
              <span className="block font-display text-sm font-medium text-muted-foreground">
                Choose currency*
              </span>
              <select
                value={v.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={!v.about.trim() || !v.goalAmount}
            >
              Submit
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

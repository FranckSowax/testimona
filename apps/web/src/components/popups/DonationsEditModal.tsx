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
          <p className="font-display text-foreground text-sm font-bold">{memorialName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              About the donations*
            </span>
            <textarea
              value={v.about}
              onChange={(e) => set('about', e.target.value)}
              required
              rows={6}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-display text-muted-foreground block text-sm font-medium">
                Goal amount*
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={v.goalAmount}
                onChange={(e) => set('goalAmount', e.target.value)}
                required
                className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-display text-muted-foreground block text-sm font-medium">
                Choose currency*
              </span>
              <select
                value={v.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
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

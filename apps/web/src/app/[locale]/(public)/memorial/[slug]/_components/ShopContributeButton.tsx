'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { contributeToShopItemAction } from '../_actions/shop';

interface Props {
  shopItemId: string;
  productName: string;
  unitPriceCents: number;
  /** Memorial's currency (admin setting) — replaces the hardcoded €. */
  currency: string;
}

const PRESET_MULTIPLIERS = [1, 2, 5];

export function ShopContributeButton({ shopItemId, productName, unitPriceCents, currency }: Props) {
  const t = useTranslations('memorial.shopContribute');
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
  const unitPriceEur = unitPriceCents / 100;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Contribution is a free amount rather than a purchased quantity — the
  // item's price only seeds the preset buttons below (1×, 2×, 5× its price).
  const [preset, setPreset] = useState<number | 'custom'>(1);
  const [customAmount, setCustomAmount] = useState('');
  const amount =
    preset === 'custom'
      ? Math.round((Number.parseFloat(customAmount) || 0) * 100) / 100
      : Math.round(preset * unitPriceEur * 100) / 100;
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [wantsItem, setWantsItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('shopItemId', shopItemId);
      fd.set('amount', String(amount));
      if (donorName) fd.set('donorName', donorName);
      if (message) fd.set('message', message);
      if (isAnonymous) fd.set('isAnonymous', '1');
      if (wantsItem) fd.set('wantsItem', '1');
      const res = await contributeToShopItemAction(null, fd);
      if (!res.ok) {
        setError(res.error ?? t('error'));
        return;
      }
      setOk(true);
      setTimeout(() => {
        setOpen(false);
        setOk(false);
      }, 1500);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press-scale bg-primary font-display text-primary-foreground rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
      >
        {t('contribute')}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('contributeTo', { name: productName })}
            className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
          >
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setOpen(false)}
              className="bg-foreground/40 absolute inset-0 backdrop-blur-sm"
            />
            <div className="animate-slide-in-up relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-[var(--shadow-overlay)] sm:my-auto sm:rounded-2xl">
              <header className="mb-4">
                <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  {t('header')}
                </p>
                <h3 className="font-display text-foreground text-lg font-bold">{productName}</h3>
                <p className="text-muted-foreground text-xs">
                  {t('itemPrice', { price: fmt(unitPriceEur) })}
                </p>
              </header>

              <div className="space-y-3">
                <fieldset className="block">
                  <legend className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {t('amountLegend')}
                  </legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {PRESET_MULTIPLIERS.map((multiplier) => {
                      const active = preset === multiplier;
                      return (
                        <button
                          key={multiplier}
                          type="button"
                          onClick={() => setPreset(multiplier)}
                          aria-pressed={active}
                          className={[
                            'press-scale font-display rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-foreground hover:bg-muted',
                          ].join(' ')}
                        >
                          {fmt(multiplier * unitPriceEur)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPreset('custom')}
                      aria-pressed={preset === 'custom'}
                      className={[
                        'press-scale font-display rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors',
                        preset === 'custom'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {t('otherAmount')}
                    </button>
                  </div>
                  {preset === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={t('enterAmount')}
                      autoFocus
                      className="border-border font-display text-foreground focus:border-primary mt-2 h-12 w-full rounded-md border bg-white px-3 text-center text-2xl font-bold focus:outline-none"
                    />
                  )}
                </fieldset>
                <label className="block">
                  <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {t('name')}
                  </span>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    maxLength={80}
                    placeholder={t('namePlaceholder')}
                    className="border-border text-foreground focus:border-primary mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none sm:text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    {t('message')}
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={280}
                    rows={2}
                    className="border-border text-foreground focus:border-primary mt-1 w-full rounded-md border bg-white px-3 py-2 text-base focus:outline-none sm:text-sm"
                  />
                </label>
                <label className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="border-border accent-primary mt-0.5 h-5 w-5 cursor-pointer rounded border-2"
                  />
                  <span className="text-foreground">{t('anonymousOption')}</span>
                </label>
                <label className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={wantsItem}
                    onChange={(e) => setWantsItem(e.target.checked)}
                    className="border-border accent-primary mt-0.5 h-5 w-5 cursor-pointer rounded border-2"
                  />
                  <span className="text-foreground">{t('wantsItemOption')}</span>
                </label>
                {wantsItem && (
                  <p className="border-accent/30 bg-accent/5 text-foreground/80 rounded-md border px-2.5 py-1.5 text-xs">
                    {t('wantsItemHint')}
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className="text-destructive mt-3 text-xs">
                  {error}
                </p>
              )}
              {ok && (
                <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  {t('thanks')}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="press-scale border-border font-display text-foreground hover:bg-muted rounded-md border bg-white px-3 py-2 text-sm font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isPending || ok || amount < 1}
                  className="press-scale bg-primary font-display text-primary-foreground rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? t('sending') : t('contributeAmount', { amount: `${fmt(amount)}` })}
                </button>
              </div>

              <p className="text-muted-foreground mt-3 text-[11px] italic">{t('demoNote')}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

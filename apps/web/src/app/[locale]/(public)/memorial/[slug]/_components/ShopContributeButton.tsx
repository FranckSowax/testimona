'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { contributeToShopItemAction } from '../_actions/shop';

interface Props {
  shopItemId: string;
  productName: string;
  unitPriceCents: number;
}

export function ShopContributeButton({
  shopItemId,
  productName,
  unitPriceCents,
}: Props) {
  const unitPriceEur = unitPriceCents / 100;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // PDF p31 — the shop sells units, so the visitor picks a quantity and the
  // amount is derived (quantity × unit price).
  const [quantity, setQuantity] = useState<number>(1);
  const amount = Math.round(quantity * unitPriceEur * 100) / 100;
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
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
      const res = await contributeToShopItemAction(null, fd);
      if (!res.ok) {
        setError(res.error ?? 'Erreur');
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
        className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Contribuer
      </button>

      {open && mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Contribuer à ${productName}`}
            className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            />
            <div className="animate-slide-in-up relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-[var(--shadow-overlay)] sm:my-auto sm:rounded-2xl">
              <header className="mb-4">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contribution
                </p>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {productName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prix unitaire : {(unitPriceCents / 100).toFixed(2)}€
                </p>
              </header>

              <div className="space-y-3">
                <div className="block">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Quantité
                  </span>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Diminuer la quantité"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="press-scale inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white text-xl font-bold text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                      }
                      className="h-12 w-20 rounded-md border border-border bg-white px-3 text-center text-2xl font-display font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Augmenter la quantité"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="press-scale inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white text-xl font-bold text-foreground hover:bg-muted"
                    >
                      +
                    </button>
                    <span className="ml-auto text-right">
                      <span className="block font-display text-xl font-bold text-foreground tabular">
                        {amount.toFixed(2)}€
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {quantity} × {unitPriceEur.toFixed(2)}€
                      </span>
                    </span>
                  </div>
                </div>
                <label className="block">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nom (optionnel)
                  </span>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    maxLength={80}
                    placeholder="Anonyme si laissé vide"
                    className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
                  />
                </label>
                <label className="block">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Message (optionnel)
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={280}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
                  />
                </label>
              </div>

              {error && (
                <p role="alert" className="mt-3 text-xs text-destructive">
                  {error}
                </p>
              )}
              {ok && (
                <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  Merci pour votre contribution ✓
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="press-scale rounded-md border border-border bg-white px-3 py-2 font-display text-sm font-bold text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isPending || ok || amount < 1}
                  className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Envoi…' : `Contribuer ${amount.toFixed(2)}€`}
                </button>
              </div>

              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Mode demo — aucun paiement réel. Le passage en réel se fait via
                Stripe.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

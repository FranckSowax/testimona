'use client';

import Image from 'next/image';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateMemorialVisualAction,
  addShopItemAction,
  type ShopActionState,
} from '../_actions/shop';
import { SHOP_PRODUCTS, CATEGORY_LABEL, findProduct } from '@/lib/shop/catalog';
import { ShopProductIcon } from './ShopProductIcon';
import { VisualActions } from './VisualActions';

// Preset unit prices — mirrors the donation modal tiers (PDF p32 "le prix
// unitaire doit être le même que dans make a donation — menu déroulant").
const UNIT_PRICE_PRESETS_EUR = [10, 15, 20, 50, 100];

interface PhotoMin {
  id: string;
  url: string;
}

interface VisualMin {
  id: string;
  imageUrl: string;
}

interface VisualPending {
  id: string;
  status: string;
}

export interface ShopOwnerPanelProps {
  memorialId: string;
  slug: string;
  photos: PhotoMin[];
  readyVisuals: VisualMin[];
  processingVisuals: VisualPending[];
  failedVisuals: VisualPending[];
  existingProductIds: string[];
  /** True if any shop item still has a mockup job in pending/processing. */
  mockupsInProgress?: boolean;
}

export function ShopOwnerPanel({
  memorialId,
  slug,
  photos,
  readyVisuals,
  processingVisuals,
  existingProductIds,
  mockupsInProgress = false,
}: ShopOwnerPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const hasProcessing = processingVisuals.length > 0;
  const cancelledRef = useRef(false);

  // Poll while at least one visual OR one shop-item mockup is processing.
  // Both share the /api/visuals/poll endpoint under the hood.
  const shouldPoll = hasProcessing || mockupsInProgress;
  useEffect(() => {
    cancelledRef.current = false;
    if (!shouldPoll) return;
    const tick = async () => {
      try {
        await fetch('/api/visuals/poll', { method: 'POST' });
      } catch {
        /* ignore */
      }
      if (!cancelledRef.current) {
        startTransition(() => router.refresh());
      }
    };
    const id = setInterval(tick, 8_000);
    void tick();
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [shouldPoll, router]);

  return (
    <details
      open
      className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5"
    >
      <summary className="cursor-pointer font-display text-sm font-bold uppercase tracking-wider text-primary">
        Gestion boutique (propriétaire)
      </summary>

      <div className="mt-5 space-y-6">
        <GenerateVisualBlock
          memorialId={memorialId}
          slug={slug}
          photos={photos}
          hasProcessing={hasProcessing}
          readyVisuals={readyVisuals}
        />

        <AddShopItemBlock
          memorialId={memorialId}
          readyVisuals={readyVisuals}
          existingProductIds={existingProductIds}
        />
      </div>
    </details>
  );
}

function GenerateVisualBlock({
  memorialId,
  slug,
  photos,
  hasProcessing,
  readyVisuals,
}: {
  memorialId: string;
  slug: string;
  photos: PhotoMin[];
  hasProcessing: boolean;
  readyVisuals: VisualMin[];
}) {
  const [state, formAction, isPending] = useActionState<
    ShopActionState | null,
    FormData
  >(generateMemorialVisualAction, null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(
    photos[0]?.id ?? '',
  );

  return (
    <div className="rounded-lg bg-white p-4">
      <h3 className="font-display text-base font-bold text-foreground">
        1. Générer le visuel commémoratif
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Choisis une photo du défunt — notre IA en tire un portrait sublimé,
        sobre et digne, qui sera appliqué sur les objets de la boutique.
      </p>

      {photos.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-surface px-3 py-2 text-xs italic text-muted-foreground">
          Ajoute d'abord des photos dans l'onglet Photos.
        </p>
      ) : (
        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="memorialId" value={memorialId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="photoId" value={selectedPhotoId} />

          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.slice(0, 12).map((p) => {
              const picked = p.id === selectedPhotoId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoId(p.id)}
                    aria-pressed={picked}
                    className={[
                      'press-scale relative block w-full overflow-hidden rounded-md border-2 transition-all',
                      picked
                        ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]'
                        : 'border-transparent hover:border-primary/40',
                    ].join(' ')}
                  >
                    <span className="relative block aspect-square">
                      <Image
                        src={p.url}
                        alt=""
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Précision (optionnel)
            </span>
            <input
              type="text"
              name="extraPrompt"
              maxLength={200}
              placeholder="Ex: en costume traditionnel, lumière de coucher de soleil…"
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {readyVisuals.length} visuel{readyVisuals.length > 1 ? 's' : ''}{' '}
              prêt{readyVisuals.length > 1 ? 's' : ''}
              {hasProcessing &&
                ` · ${hasProcessing ? 'génération en cours' : ''}`}
            </p>
            <button
              type="submit"
              disabled={isPending || !selectedPhotoId}
              className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Envoi…' : 'Générer un nouveau visuel'}
            </button>
          </div>

          {state?.error && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
        </form>
      )}

      {readyVisuals.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Visuels disponibles
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {readyVisuals.map((v) => (
              <li
                key={v.id}
                className="overflow-hidden rounded-md border border-border bg-white"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={v.imageUrl}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
                <VisualActions visualId={v.id} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Le visuel à appliquer sur les objets de la boutique se choisit
            ci-dessous, dans le menu déroulant « Visuel associé » à l'ajout
            d'un article. Tu peux regénérer ou supprimer un visuel à tout
            moment.
          </p>
        </div>
      )}
    </div>
  );
}

function AddShopItemBlock({
  memorialId,
  readyVisuals,
  existingProductIds,
}: {
  memorialId: string;
  readyVisuals: VisualMin[];
  existingProductIds: string[];
}) {
  const [state, formAction, isPending] = useActionState<
    ShopActionState | null,
    FormData
  >(addShopItemAction, null);
  const [productId, setProductId] = useState(SHOP_PRODUCTS[0]!.id);
  const product = findProduct(productId);
  const inUse = existingProductIds.includes(productId);

  // Reset on success
  useEffect(() => {
    if (state?.ok) {
      // Form already cleared by re-render; intentionally no-op
    }
  }, [state]);

  return (
    <div className="rounded-lg bg-white p-4">
      <h3 className="font-display text-base font-bold text-foreground">
        2. Ajouter un objet à la boutique
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Définis la quantité ciblée et le prix unitaire. Les donateurs pourront
        contribuer pour financer chaque article.
      </p>

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="memorialId" value={memorialId} />

        <label className="block">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Produit
          </span>
          <select
            name="productId"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
          >
            {SHOP_PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {CATEGORY_LABEL[p.category]}
              </option>
            ))}
          </select>
        </label>

        {product && (
          <p className="rounded-md bg-surface/60 p-3 text-xs text-muted-foreground">
            <ShopProductIcon
              iconKey={product.iconKey}
              className="mr-2 inline-block h-4 w-4 align-text-bottom text-primary"
            />
            {product.description}
            {inUse && (
              <span className="ml-2 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                déjà dans la boutique
              </span>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantité visée
            </span>
            <input
              type="number"
              name="targetQuantity"
              min={1}
              defaultValue={50}
              required
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
          </label>
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Prix unitaire (€)
            </span>
            <select
              key={productId}
              name="unitPriceEuros"
              defaultValue={String(
                product ? Math.round(product.defaultPriceCents / 100) : 10,
              )}
              required
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            >
              {Array.from(
                new Set([
                  ...(product ? [Math.round(product.defaultPriceCents / 100)] : []),
                  ...UNIT_PRICE_PRESETS_EUR,
                ]),
              )
                .sort((a, b) => a - b)
                .map((euros) => (
                  <option key={euros} value={String(euros)}>
                    {euros} €
                  </option>
                ))}
            </select>
          </label>
        </div>

        {readyVisuals.length > 0 && (
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Visuel associé (optionnel)
            </span>
            <select
              name="visualId"
              defaultValue={readyVisuals[0]?.id ?? ''}
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
            >
              <option value="">— Aucun —</option>
              {readyVisuals.map((v, i) => (
                <option key={v.id} value={v.id}>
                  Visuel #{i + 1}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Notes (optionnel)
          </span>
          <input
            type="text"
            name="notes"
            maxLength={200}
            placeholder="Ex: couleurs noires et blanches, tailles M/L/XL…"
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || inUse}
            className="press-scale rounded-md bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Ajout…' : inUse ? 'Déjà dans la boutique' : 'Ajouter à la boutique'}
          </button>
        </div>

        {state?.error && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}

// RemoveButton lives in its own file (ShopItemRemoveButton.tsx) so it can
// be safely imported by the server-side ShopSection — Next.js doesn't
// forward static properties across the Server → Client boundary.

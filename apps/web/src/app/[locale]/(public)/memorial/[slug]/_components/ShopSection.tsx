import Image from 'next/image';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { findProduct, CATEGORY_LABEL } from '@/lib/shop/catalog';
import { ShopProductIcon } from './ShopProductIcon';
import { ShopOwnerPanel } from './ShopOwnerPanel';
import { ShopContributeButton } from './ShopContributeButton';

export const dynamic = 'force-dynamic';

interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
}

interface VisualRow {
  id: string;
  imageUrl: string | null;
  status: string;
  errorMessage: string | null;
  sourcePhotoId: string | null;
  createdAt: string;
}

interface ShopItemRow {
  id: string;
  productId: string;
  visualId: string | null;
  targetQuantity: number;
  unitPriceCents: number;
  fundedCents: number;
  notes: string | null;
  position: number;
}

const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export async function ShopSection({
  memorialId,
  memorialName,
  slug,
  isOwner,
}: {
  memorialId: string;
  memorialName: string;
  slug: string;
  isOwner: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  const [photosRes, visualsRes, itemsRes] = await Promise.all([
    supabase
      .from('Photo')
      .select('id, url, caption')
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .limit(40)
      .returns<PhotoRow[]>(),
    supabase
      .from('MemorialVisual')
      .select('id, imageUrl, status, errorMessage, sourcePhotoId, createdAt')
      .eq('memorialId', memorialId)
      .order('createdAt', { ascending: false })
      .limit(10)
      .returns<VisualRow[]>(),
    supabase
      .from('MemorialShopItem')
      .select(
        'id, productId, visualId, targetQuantity, unitPriceCents, fundedCents, notes, position',
      )
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .returns<ShopItemRow[]>(),
  ]);

  const photos = photosRes.data ?? [];
  const visuals = visualsRes.data ?? [];
  const items = itemsRes.data ?? [];

  const readyVisuals = visuals.filter((v) => v.status === 'ready' && v.imageUrl);
  const activeVisual = readyVisuals[0] ?? null;
  const visualById = new Map(visuals.map((v) => [v.id, v]));

  const totalTargetCents = items.reduce(
    (sum, it) => sum + it.targetQuantity * it.unitPriceCents,
    0,
  );
  const totalFundedCents = items.reduce((sum, it) => sum + it.fundedCents, 0);
  const overallProgress =
    totalTargetCents > 0 ? Math.min(100, (totalFundedCents / totalTargetCents) * 100) : 0;

  return (
    <section aria-labelledby="shop-heading" className="space-y-6">
      <header className="space-y-2">
        <h2
          id="shop-heading"
          className="font-display text-2xl font-bold text-foreground"
        >
          Boutique du mémorial
        </h2>
        <p className="text-sm text-muted-foreground">
          Participez aux préparatifs en contribuant à l'achat d'objets pour la
          veille, la cérémonie ou un hommage durable. Chaque don alimente une
          liste choisie par la famille — t-shirts, éventails, banderoles, ou
          accessoires partenaires.
        </p>
      </header>

      {activeVisual?.imageUrl && (
        <figure className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]">
          <div className="relative aspect-[3/4] w-full sm:aspect-[4/3]">
            <Image
              src={activeVisual.imageUrl}
              alt={`Visuel commémoratif de ${memorialName}`}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
            />
          </div>
          <figcaption className="px-4 py-3 text-xs italic text-muted-foreground">
            Visuel commémoratif généré pour ce mémorial — appliqué sur les
            objets ci-dessous.
          </figcaption>
        </figure>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Avancement global
            </p>
            <p className="font-display text-sm font-bold text-foreground">
              {eurFmt.format(totalFundedCents / 100)}{' '}
              <span className="text-muted-foreground">
                / {eurFmt.format(totalTargetCents / 100)}
              </span>
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface/60 px-6 py-12 text-center text-sm italic text-muted-foreground">
          {isOwner
            ? 'Aucun objet ajouté à la boutique. Génère d\'abord un visuel puis ajoute les articles que tu veux financer.'
            : 'La famille n\'a pas encore ouvert de boutique pour ce mémorial.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const product = findProduct(item.productId);
            if (!product) return null;
            const totalCents = item.targetQuantity * item.unitPriceCents;
            const progress = totalCents > 0 ? Math.min(100, (item.fundedCents / totalCents) * 100) : 100;
            const fundedUnits = Math.floor(item.fundedCents / item.unitPriceCents);
            const visual = item.visualId ? visualById.get(item.visualId) : null;
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {visual?.imageUrl ? (
                      <Image
                        src={visual.imageUrl}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-foreground/40">
                        <ShopProductIcon iconKey={product.iconKey} className="h-12 w-12" />
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-foreground shadow ring-1 ring-border">
                      <ShopProductIcon iconKey={product.iconKey} className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {product.name}
                      </h3>
                      <span className="rounded-full bg-surface px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {CATEGORY_LABEL[product.category]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.notes || product.description}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-3 text-sm">
                      <span className="font-display font-bold text-foreground">
                        {eurFmt.format(item.unitPriceCents / 100)}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          / unité
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Objectif : {item.targetQuantity} unités ·{' '}
                        {eurFmt.format(totalCents / 100)} total
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-foreground/80">
                          <span className="font-display font-bold tabular">
                            {fundedUnits}
                          </span>{' '}
                          / {item.targetQuantity} unités financées
                        </span>
                        <span className="font-display font-bold tabular text-primary">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    {product.partner && (
                      <p className="rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs text-foreground/80">
                        Produit partenaire — coordonné par notre réseau de
                        fournisseurs après collecte complète.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <ShopContributeButton
                      shopItemId={item.id}
                      productName={product.name}
                      unitPriceCents={item.unitPriceCents}
                    />
                    {isOwner && (
                      <ShopOwnerPanel.RemoveButton itemId={item.id} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOwner && (
        <ShopOwnerPanel
          memorialId={memorialId}
          slug={slug}
          photos={photos.map((p) => ({ id: p.id, url: p.url }))}
          readyVisuals={readyVisuals.map((v) => ({
            id: v.id,
            imageUrl: v.imageUrl!,
          }))}
          processingVisuals={visuals.filter(
            (v) => v.status === 'pending' || v.status === 'processing',
          )}
          failedVisuals={visuals.filter((v) => v.status === 'failed')}
          existingProductIds={items.map((it) => it.productId)}
        />
      )}
    </section>
  );
}

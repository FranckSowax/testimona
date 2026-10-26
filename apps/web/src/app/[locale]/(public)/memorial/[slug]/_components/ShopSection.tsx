import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { findProduct, CATEGORY_LABEL } from '@/lib/shop/catalog';
import { ShopProductIcon } from './ShopProductIcon';
import { ShopOwnerPanel } from './ShopOwnerPanel';
import { ShopContributeButton } from './ShopContributeButton';
import { ShopContributionsOwnerPanel } from './ShopContributionsOwnerPanel';
import { getMemorialCurrency } from '@/lib/memorial/currency';
import { ShopItemRemoveButton } from './ShopItemRemoveButton';

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
  mockupImageUrl: string | null;
  mockupStatus: string;
  mockupErrorMessage: string | null;
}

// Formatter in the memorial's own currency (admin donation setting).
const moneyFmt = (currency: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
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
  const [t, currency, locale] = await Promise.all([
    getTranslations('memorial.shopSection'),
    getMemorialCurrency(memorialId),
    getLocale(),
  ]);
  const eurFmt = moneyFmt(currency); // name kept — now memorial-currency aware
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
        'id, productId, visualId, targetQuantity, unitPriceCents, fundedCents, notes, position, mockupImageUrl, mockupStatus, mockupErrorMessage',
      )
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .returns<ShopItemRow[]>(),
  ]);

  const photos = photosRes.data ?? [];
  const visuals = visualsRes.data ?? [];
  // PDF p33 — display shop items in alphabetical order (by product name).
  const items = [...(itemsRes.data ?? [])].sort((a, b) => {
    const an = findProduct(a.productId)?.name ?? a.productId;
    const bn = findProduct(b.productId)?.name ?? b.productId;
    return an.localeCompare(bn, 'fr');
  });

  const readyVisuals = visuals.filter((v) => v.status === 'ready' && v.imageUrl);
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
        <h2 id="shop-heading" className="font-display text-foreground text-2xl font-bold">
          {t('heading')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
      </header>

      {/* Hero visual hidden on the public-facing shop — visitors land
          directly on the product cards (the visual is still visible on
          the items themselves via the mockup image). It remains in the
          owner panel below for management. */}

      {items.length > 0 && (
        <div className="border-border rounded-xl border bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-display text-muted-foreground text-sm font-bold uppercase tracking-wider">
              {t('overallProgress')}
            </p>
            <p className="font-display text-foreground text-sm font-bold">
              {eurFmt.format(totalFundedCents / 100)}{' '}
              <span className="text-muted-foreground">
                / {eurFmt.format(totalTargetCents / 100)}
              </span>
            </p>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="border-border bg-surface/60 text-muted-foreground rounded-md border border-dashed px-6 py-12 text-center text-sm italic">
          {isOwner ? t('emptyOwner') : t('emptyPublic')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const product = findProduct(item.productId);
            if (!product) return null;
            const totalCents = item.targetQuantity * item.unitPriceCents;
            const progress =
              totalCents > 0 ? Math.min(100, (item.fundedCents / totalCents) * 100) : 100;
            const fundedUnits = Math.floor(item.fundedCents / item.unitPriceCents);
            const visual = item.visualId ? visualById.get(item.visualId) : null;
            return (
              <li
                key={item.id}
                className="border-border overflow-hidden rounded-xl border bg-white shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
                  <div className="to-surface ring-border relative aspect-square w-full max-w-[160px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-white ring-1 sm:w-40">
                    {item.mockupImageUrl ? (
                      <Image
                        src={item.mockupImageUrl}
                        alt={t('mockupAlt', { name: product.name })}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : item.mockupStatus === 'processing' || item.mockupStatus === 'pending' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <span className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
                        <p className="font-display text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                          {t('mockupInProgress')}
                        </p>
                      </div>
                    ) : visual?.imageUrl ? (
                      <Image
                        src={visual.imageUrl}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover opacity-90"
                      />
                    ) : (
                      <span className="text-foreground/40 absolute inset-0 flex items-center justify-center">
                        <ShopProductIcon iconKey={product.iconKey} className="h-14 w-14" />
                      </span>
                    )}
                    <span className="text-foreground ring-border absolute bottom-1.5 left-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1">
                      <ShopProductIcon iconKey={product.iconKey} className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-foreground text-lg font-bold">
                        {product.name}
                      </h3>
                      <span className="bg-surface font-display text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {CATEGORY_LABEL[product.category]}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {item.notes || product.description}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-3 text-sm">
                      <span className="font-display text-foreground font-bold">
                        {eurFmt.format(item.unitPriceCents / 100)}
                        <span className="text-muted-foreground ml-1 text-xs font-medium">
                          {t('perUnit')}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {t('target', {
                          quantity: item.targetQuantity,
                          total: eurFmt.format(totalCents / 100),
                        })}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-foreground/80">
                          <span className="font-display tabular font-bold">{fundedUnits}</span>{' '}
                          {t('unitsFunded', { quantity: item.targetQuantity })}
                        </span>
                        <span className="font-display tabular text-primary font-bold">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    {product.partner && (
                      <p className="border-accent/30 bg-accent/5 text-foreground/80 rounded-md border px-2.5 py-1.5 text-xs">
                        {t('partnerNote')}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <ShopContributeButton
                      currency={currency}
                      shopItemId={item.id}
                      productName={product.name}
                      unitPriceCents={item.unitPriceCents}
                    />
                    {isOwner && <ShopItemRemoveButton itemId={item.id} />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ShopContributionsOwnerPanel
        memorialId={memorialId}
        isOwner={isOwner}
        locale={locale}
        currency={currency}
      />

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
          mockupsInProgress={items.some(
            (it) => it.mockupStatus === 'pending' || it.mockupStatus === 'processing',
          )}
        />
      )}
    </section>
  );
}

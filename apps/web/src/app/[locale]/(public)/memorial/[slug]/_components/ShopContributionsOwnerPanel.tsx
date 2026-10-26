import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { findProduct } from '@/lib/shop/catalog';

interface ShopItemRow {
  id: string;
  productId: string;
}

interface ContributionRow {
  shopItemId: string;
  donorName: string | null;
  donorEmail: string | null;
  message: string | null;
  amountCents: number;
  isAnonymous: boolean;
  wantsItem: boolean;
  createdAt: string;
}

async function getContributionDetails(
  memorialId: string,
): Promise<{ contribution: ContributionRow; productName: string }[]> {
  // Admin client: owner-only view of every contributor's real contact
  // details, regardless of the public anonymity flag they picked.
  const supabase = getSupabaseAdminClient();
  const { data: items } = await supabase
    .from('MemorialShopItem')
    .select('id, productId')
    .eq('memorialId', memorialId)
    .returns<ShopItemRow[]>();
  if (!items || items.length === 0) return [];

  const productByItemId = new Map(items.map((it) => [it.id, it.productId]));
  const { data: contributions } = await supabase
    .from('ShopContribution')
    .select(
      'shopItemId, donorName, donorEmail, message, amountCents, isAnonymous, wantsItem, createdAt',
    )
    .in(
      'shopItemId',
      items.map((it) => it.id),
    )
    .eq('status', 'Succeeded')
    .order('createdAt', { ascending: false })
    .limit(100)
    .returns<ContributionRow[]>();

  return (contributions ?? []).map((c) => {
    const productId = productByItemId.get(c.shopItemId);
    const productName = (productId && findProduct(productId)?.name) || productId || '—';
    return { contribution: c, productName };
  });
}

function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Owner-only: full contributor contact details for the shop, including who wants a physical item. */
export async function ShopContributionsOwnerPanel({
  memorialId,
  isOwner,
  locale,
  currency,
}: {
  memorialId: string;
  isOwner: boolean;
  locale: string;
  currency: string;
}) {
  if (!isOwner) return null;

  const [t, rows] = await Promise.all([
    getTranslations('memorial.contributorsPanel'),
    getContributionDetails(memorialId),
  ]);

  return (
    <div className="border-border rounded-xl border bg-white shadow-[var(--shadow-card)]">
      <div className="border-border border-b px-4 py-3 sm:px-5">
        <h3 className="font-display text-foreground/70 text-sm font-semibold uppercase tracking-widest">
          {t('contributionsTitle')}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{t('subtitle')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm italic sm:px-5">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {rows.map(({ contribution: c, productName }, i) => (
            <li key={`${c.createdAt}-${i}`} className="space-y-1 px-4 py-3 text-sm sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground font-medium">
                  {c.donorName?.trim() || t('noEmail')}
                  {c.isAnonymous && (
                    <span className="bg-surface font-display text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {t('anonymousBadge')}
                    </span>
                  )}
                  {c.wantsItem && (
                    <span className="bg-accent/10 font-display text-accent ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {t('wantsItemBadge')}
                    </span>
                  )}
                </p>
                <span className="text-foreground font-semibold">
                  {formatMoney(c.amountCents, currency, locale)}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {t('itemLabel', { name: productName })}
              </p>
              <p className="text-muted-foreground text-xs">{c.donorEmail || t('noEmail')}</p>
              <p className="text-muted-foreground text-xs italic">{c.message || t('noMessage')}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(c.createdAt).toLocaleString(locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

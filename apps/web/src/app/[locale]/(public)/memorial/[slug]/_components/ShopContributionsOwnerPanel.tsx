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
    .in('shopItemId', items.map((it) => it.id))
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
    <div className="rounded-xl border border-border bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/70">
          {t('contributionsTitle')}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm italic text-muted-foreground sm:px-5">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ contribution: c, productName }, i) => (
            <li key={`${c.createdAt}-${i}`} className="space-y-1 px-4 py-3 text-sm sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {c.donorName?.trim() || t('noEmail')}
                  {c.isAnonymous && (
                    <span className="ml-2 rounded-full bg-surface px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('anonymousBadge')}
                    </span>
                  )}
                  {c.wantsItem && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-accent">
                      {t('wantsItemBadge')}
                    </span>
                  )}
                </p>
                <span className="font-semibold text-foreground">
                  {formatMoney(c.amountCents, currency, locale)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('itemLabel', { name: productName })}</p>
              <p className="text-xs text-muted-foreground">{c.donorEmail || t('noEmail')}</p>
              <p className="text-xs italic text-muted-foreground">
                {c.message || t('noMessage')}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString(locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface OwnerShopContribution {
  shopItemId: string;
  donorName: string | null;
  amountCents: number;
  createdAt: string;
}

/**
 * Contributions boutique réussies sur les mémoriaux dont `ownerId` est propriétaire.
 *
 * WHY: le nom des contributeurs n'est plus lisible via l'API publique (migration
 * 20261027000100). Le propriétaire le voit toujours, mais seulement par ce chemin
 * serveur, qui retrouve lui-même ses mémoriaux au lieu de croire l'appelant.
 *
 * @example
 *   const contribs = await listOwnerShopContributions(user.id);
 */
export async function listOwnerShopContributions(
  ownerId: string,
  limit = 500,
): Promise<OwnerShopContribution[]> {
  const db = getSupabaseAdminClient();

  const { data: memorials } = await db
    .from('Memorial')
    .select('id')
    .eq('ownerId', ownerId)
    .returns<{ id: string }[]>();
  const memorialIds = (memorials ?? []).map((m) => m.id);
  if (memorialIds.length === 0) return [];

  const { data: items } = await db
    .from('MemorialShopItem')
    .select('id')
    .in('memorialId', memorialIds)
    .returns<{ id: string }[]>();
  const itemIds = (items ?? []).map((it) => it.id);
  if (itemIds.length === 0) return [];

  const { data, error } = await db
    .from('ShopContribution')
    .select('shopItemId, donorName, amountCents, createdAt')
    .in('shopItemId', itemIds)
    .eq('status', 'Succeeded')
    .order('createdAt', { ascending: false })
    .limit(limit)
    .returns<OwnerShopContribution[]>();
  if (error) {
    console.error('[shop-contributions] lecture impossible', { code: error.code });
    return [];
  }
  return data ?? [];
}

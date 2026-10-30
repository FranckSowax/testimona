import 'server-only';
import { isPlatformAdmin } from '@/lib/auth/platform-admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { RepoResult } from '@/modules/dossier/repo';
import {
  ADMIN_COLUMNS,
  fail,
  NO_ROWS,
  type ProviderRow,
  toProvider,
} from '@/modules/providers/repo';
import type { Provider, ProviderFilters } from '@/modules/providers/schema';

/** WHY: l'écran admin liste au plus 200 prestataires ; les filtres réduisent la liste. */
const LIST_LIMIT = 200;
const FORBIDDEN = { data: null, error: { code: '42501', message: 'platform admin only' } };

// WHY: `provider.whatsapp` n'est plus lisible par le rôle `authenticated` (migration
// 20261029000200). L'écran admin le lit avec le client service-role, qui contourne aussi la RLS :
// chaque fonction vérifie elle-même `isPlatformAdmin()`, sans croire l'appelant.

/**
 * Tous les prestataires, numéro compris, triés par ville puis nom.
 *
 * @example
 * const res = await listProvidersWithContact({ city: 'Libreville' }); // 42501 hors admin
 */
export async function listProvidersWithContact(
  filters: ProviderFilters,
): Promise<RepoResult<Provider[]>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const db = getSupabaseAdminClient();
  let query = db.from('provider').select(ADMIN_COLUMNS);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.category) query = query.eq('category_key', filters.category);
  const { data, error } = await query
    .order('city')
    .order('name')
    .limit(LIST_LIMIT)
    .returns<ProviderRow[]>();
  if (error) {
    console.error('[providers] listProviders impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toProvider), error: null };
}

/**
 * Un prestataire, numéro compris, ou `no_rows` s'il n'existe pas.
 *
 * @example
 * const res = await getProviderWithContact(id); // 42501 hors admin
 */
export async function getProviderWithContact(id: string): Promise<RepoResult<Provider>> {
  if (!(await isPlatformAdmin())) return FORBIDDEN;
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from('provider')
    .select(ADMIN_COLUMNS)
    .eq('id', id)
    .returns<ProviderRow[]>()
    .maybeSingle();
  if (error) return fail(error);
  return data ? { data: toProvider(data), error: null } : NO_ROWS;
}

import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { ProviderCategory } from './categories';
import type { Provider, ProviderFilters, ProviderInput } from './schema';

const COLUMNS =
  'id, category_key, name, city, district, whatsapp, price_note, is_example, verified_at, active';
/** WHY: l'écran admin liste au plus 200 prestataires ; les filtres réduisent la liste. */
const LIST_LIMIT = 200;
/** WHY: le tri et la ville se font en code ; 200 lignes couvrent largement le pilote. */
const PANEL_LIMIT = 200;

interface ProviderRow {
  id: string;
  category_key: ProviderCategory;
  name: string;
  city: string;
  district: string | null;
  whatsapp: string | null;
  price_note: string | null;
  is_example: boolean;
  verified_at: string | null;
  active: boolean;
}

/** Données écrites : la saisie, avec la date de vérification calculée par le service. */
export type ProviderWrite = Omit<ProviderInput, 'verified'> & { verifiedAt: string | null };

const toProvider = (r: ProviderRow): Provider => ({
  id: r.id,
  categoryKey: r.category_key,
  name: r.name,
  city: r.city,
  district: r.district,
  whatsapp: r.whatsapp,
  priceNote: r.price_note,
  isExample: r.is_example,
  verifiedAt: r.verified_at,
  active: r.active,
});

const toRow = (p: ProviderWrite) => ({
  category_key: p.categoryKey,
  name: p.name,
  city: p.city,
  district: p.district,
  whatsapp: p.whatsapp,
  price_note: p.priceNote,
  is_example: p.isExample,
  verified_at: p.verifiedAt,
  active: p.active,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'providers error' },
  };
}

const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/** Prestataires visibles (RLS : tous pour un administrateur), triés par ville puis nom. */
export async function listProviders(filters: ProviderFilters): Promise<RepoResult<Provider[]>> {
  const db = await getSupabaseServer();
  let query = db.from('provider').select(COLUMNS);
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
 * Prestataires des catégories d'un encadré : actifs, vérifiés ou d'exemple.
 * WHY: un administrateur lit aussi les non-vérifiés (RLS) ; ce filtre donne à tous le même
 * encadré.
 */
export async function listPanelProviders(
  categories: readonly ProviderCategory[],
): Promise<RepoResult<Provider[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('provider')
    .select(COLUMNS)
    .in('category_key', [...categories])
    .eq('active', true)
    .or('is_example.eq.true,verified_at.not.is.null')
    .order('name')
    .limit(PANEL_LIMIT)
    .returns<ProviderRow[]>();
  if (error) {
    console.error('[providers] listPanelProviders impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toProvider), error: null };
}

/** Un prestataire, ou `no_rows` s'il n'existe pas ou n'est pas visible. */
export async function getProvider(id: string): Promise<RepoResult<Provider>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('provider')
    .select(COLUMNS)
    .eq('id', id)
    .returns<ProviderRow[]>()
    .maybeSingle();
  if (error) return fail(error);
  return data ? { data: toProvider(data), error: null } : NO_ROWS;
}

/** Crée un prestataire (RLS : administrateur seulement). */
export async function insertProvider(write: ProviderWrite): Promise<RepoResult<{ id: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').insert(toRow(write)).select('id').single();
  if (error) return fail(error);
  return { data: { id: (data as { id: string }).id }, error: null };
}

/** Modifie un prestataire ; `no_rows` si la RLS filtre la ligne. */
export async function updateProvider(id: string, write: ProviderWrite): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.from('provider').update(toRow(write)).eq('id', id).select('id');
  if (error) return fail(error);
  return data && data.length > 0 ? { data: true, error: null } : NO_ROWS;
}

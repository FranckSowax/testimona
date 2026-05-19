import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export type AdType = 'image' | 'html';
export const AD_SLOTS = [
  'home-sidebar',
  'home-footer',
  'memorial-aside',
  'dashboard-sidebar',
] as const;
export type AdSlot = (typeof AD_SLOTS)[number];

export interface AdRow {
  id: string;
  name: string;
  slot: string;
  type: AdType;
  imageUrl: string | null;
  targetUrl: string | null;
  html: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export async function getAdsList(): Promise<AdRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('AdSpace')
    .select(
      'id, name, slot, type, imageUrl, targetUrl, html, isActive, startsAt, expiresAt, createdAt, updatedAt',
    )
    .order('createdAt', { ascending: false })
    .limit(200)
    .returns<AdRow[]>();
  return data ?? [];
}

export async function getAdById(id: string): Promise<AdRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('AdSpace')
    .select(
      'id, name, slot, type, imageUrl, targetUrl, html, isActive, startsAt, expiresAt, createdAt, updatedAt',
    )
    .eq('id', id)
    .maybeSingle<AdRow>();
  return data ?? null;
}

/**
 * Reads at most one currently-active ad for a given slot. RLS on AdSpace
 * already filters by isActive + startsAt/expiresAt window for anon users,
 * but we re-filter in code to keep the helper robust when called from a
 * server-role context too.
 */
export async function getActiveAdForSlot(slot: AdSlot): Promise<AdRow | null> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('AdSpace')
    .select(
      'id, name, slot, type, imageUrl, targetUrl, html, isActive, startsAt, expiresAt, createdAt, updatedAt',
    )
    .eq('slot', slot)
    .eq('isActive', true)
    .order('createdAt', { ascending: false })
    .limit(1)
    .returns<AdRow[]>();
  const ad = (data ?? [])[0];
  if (!ad) return null;
  if (ad.startsAt && ad.startsAt > now) return null;
  if (ad.expiresAt && ad.expiresAt < now) return null;
  return ad;
}

import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AdRow, AdSlot } from './ads-shared';

export { AD_SLOTS } from './ads-shared';
export type { AdType, AdSlot, AdRow } from './ads-shared';

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

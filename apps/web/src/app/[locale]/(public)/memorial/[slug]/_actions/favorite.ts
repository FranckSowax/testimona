'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidateMemorialPages } from '@/lib/revalidate';

export interface FavoriteActionState {
  ok?: boolean;
  favorite?: boolean;
  error?: string;
}

/**
 * Toggle the current user's favorite on a memorial. Account required — a
 * logged-out visitor gets `needsAuth`. Written with the service-role client
 * after the auth check (no RLS policy needed). Per-account, so favorites follow
 * the user across devices (unlike the old localStorage list).
 */
export async function toggleFavoriteAction(
  memorialId: string,
  slug: string,
): Promise<FavoriteActionState & { needsAuth?: boolean }> {
  if (!memorialId) return { error: 'memorialId requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { needsAuth: true, error: 'auth required' };
  const userId = userData.user.id;

  const adminDb = getSupabaseAdminClient();

  // Only existing, visible memorials can be favorited — blocks blind
  // enumeration of private memorial ids through the service-role client.
  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('id, isPublic, ownerId')
    .eq('id', memorialId)
    .maybeSingle<{ id: string; isPublic: boolean; ownerId: string }>();
  if (!memorial) return { error: 'Mémorial introuvable.' };
  if (!memorial.isPublic && memorial.ownerId !== userId)
    return { error: 'Mémorial introuvable.' };

  const { data: existing } = await adminDb
    .from('MemorialFavorite')
    .select('id')
    .eq('userId', userId)
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await adminDb
      .from('MemorialFavorite')
      .delete()
      .eq('id', existing.id);
    if (error) return { error: error.message };
    if (slug) revalidateMemorialPages(slug);
    revalidatePath('/dashboard');
    return { ok: true, favorite: false };
  }

  const { error } = await adminDb.from('MemorialFavorite').insert({
    id: randomUUID(),
    userId,
    memorialId,
  });
  if (error) return { error: error.message };
  if (slug) revalidateMemorialPages(slug);
  revalidatePath('/dashboard');
  return { ok: true, favorite: true };
}

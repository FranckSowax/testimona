import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Centralised memorial management permissions (G3 — co-ownership).
 *
 * A user can manage a memorial when they are either:
 *   - the original owner (Memorial.ownerId), or
 *   - an accepted co-owner (MemorialMember.status = 'accepted').
 *
 * Uses the service-role client so the check is reliable from any server
 * context (RLS-independent); the caller is responsible for having
 * authenticated the user first.
 */

export async function getMemorialManagers(
  memorialId: string,
): Promise<{ ownerId: string | null; managerIds: Set<string> }> {
  const db = getSupabaseAdminClient();
  const [{ data: memorial }, { data: members }] = await Promise.all([
    db.from('Memorial').select('ownerId').eq('id', memorialId).maybeSingle<{ ownerId: string }>(),
    db
      .from('MemorialMember')
      .select('userId')
      .eq('memorialId', memorialId)
      .eq('status', 'accepted')
      .returns<{ userId: string | null }[]>(),
  ]);

  const managerIds = new Set<string>();
  if (memorial?.ownerId) managerIds.add(memorial.ownerId);
  for (const m of members ?? []) {
    if (m.userId) managerIds.add(m.userId);
  }
  return { ownerId: memorial?.ownerId ?? null, managerIds };
}

/** True when `userId` may manage (owner or accepted co-owner). */
export async function canManageMemorial(
  memorialId: string,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { managerIds } = await getMemorialManagers(memorialId);
  return managerIds.has(userId);
}

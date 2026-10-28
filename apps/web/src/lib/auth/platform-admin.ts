import 'server-only';
import { getCurrentUser } from '@/lib/supabase/server';

/**
 * Vrai si l'utilisateur connecté administre la plateforme Testimona.
 * WHY: même règle que `requireAdmin()` et que `is_admin()` en base : le rôle vient de
 * `app_metadata`, que l'utilisateur ne peut pas modifier (jamais de `user_metadata`). Ce fichier
 * n'importe pas le client service-role.
 *
 * @example
 * if (!(await isPlatformAdmin())) return { ok: false, error: 'forbidden' };
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return (user?.app_metadata as { role?: string } | undefined)?.role === 'Admin';
}

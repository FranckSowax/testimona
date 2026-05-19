'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';

export interface AdminUserActionState {
  ok?: boolean;
  error?: string;
}

const BAN_DURATIONS = {
  '24h': '24h',
  '7d': '168h',
  '30d': '720h',
  forever: '876000h',
} as const;

type BanDurationKey = keyof typeof BAN_DURATIONS;

export async function banUserAction(
  _prev: AdminUserActionState | null,
  formData: FormData,
): Promise<AdminUserActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId') ?? '').trim();
  const duration = (String(formData.get('duration') ?? '7d') as BanDurationKey) ?? '7d';
  if (!userId) return { error: 'userId requis.' };
  if (userId === admin.id) return { error: 'Impossible de se bannir soi-même.' };

  const supabase = getSupabaseAdminClient();
  const banDuration = BAN_DURATIONS[duration] ?? BAN_DURATIONS['7d'];
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function unbanUserAction(
  _prev: AdminUserActionState | null,
  formData: FormData,
): Promise<AdminUserActionState> {
  await requireAdmin();
  const userId = String(formData.get('userId') ?? '').trim();
  if (!userId) return { error: 'userId requis.' };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function setUserRoleAction(
  _prev: AdminUserActionState | null,
  formData: FormData,
): Promise<AdminUserActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  if (!userId) return { error: 'userId requis.' };
  if (role !== 'Admin' && role !== 'User') return { error: 'Rôle invalide.' };
  if (userId === admin.id && role !== 'Admin') {
    return { error: 'Impossible de retirer votre propre rôle admin.' };
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing } = await supabase.auth.admin.getUserById(userId);
  const previousMeta = (existing?.user?.app_metadata ?? {}) as Record<string, unknown>;
  const nextMeta = role === 'Admin' ? { ...previousMeta, role: 'Admin' } : { ...previousMeta };
  if (role === 'User') delete (nextMeta as { role?: string }).role;

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: nextMeta,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function sendPasswordResetAction(
  _prev: AdminUserActionState | null,
  formData: FormData,
): Promise<AdminUserActionState> {
  await requireAdmin();
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email requis.' };

  const supabase = getSupabaseAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/dashboard/profile`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { error: error.message };

  return { ok: true };
}

export async function deleteUserAction(
  _prev: AdminUserActionState | null,
  formData: FormData,
): Promise<AdminUserActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId') ?? '').trim();
  if (!userId) return { error: 'userId requis.' };
  if (userId === admin.id) return { error: 'Impossible de se supprimer soi-même.' };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface ProfileActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  _prev: ProfileActionState | null,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const nickname = String(formData.get('nickname') ?? '').trim();

  const fieldErrors: Record<string, string> = {};
  if (fullName.length > 80) fieldErrors.fullName = 'max 80 caractères';
  if (nickname.length > 50) fieldErrors.nickname = 'max 50 caractères';
  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      nickname: nickname || null,
    },
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard/profile');
  return { ok: true };
}

export interface PasswordResetState {
  ok?: boolean;
  error?: string;
}

export async function sendPasswordResetAction(): Promise<PasswordResetState> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) return { error: 'auth required' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

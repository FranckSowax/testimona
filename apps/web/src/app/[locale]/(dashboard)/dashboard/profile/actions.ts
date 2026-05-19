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

export interface ChangePasswordState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Lets a logged-in user pick a new password directly (no email round-trip).
 * Supabase Auth re-validates the current session before applying the update,
 * so this works as long as the JWT is fresh.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState | null,
  formData: FormData,
): Promise<ChangePasswordState> {
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  const fieldErrors: Record<string, string> = {};
  if (newPassword.length < 8) fieldErrors.newPassword = 'min 8 caractères';
  else if (newPassword.length > 200) fieldErrors.newPassword = 'max 200 caractères';
  if (confirmPassword !== newPassword)
    fieldErrors.confirmPassword = 'les mots de passe ne correspondent pas';
  if (Object.keys(fieldErrors).length > 0)
    return { error: 'Validation', fieldErrors };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { ok: true };
}

export interface PayoutContactState {
  ok?: boolean;
  error?: string;
}

/**
 * Memorial owners requesting payout setup. For the MVP we just persist
 * the contact request as a notification-style row in MemorialAdminRequest
 * (re-purposed) — replace with a dedicated PayoutRequest table when the
 * full Stripe Connect flow lands.
 */
export async function requestPayoutSetupAction(
  _prev: PayoutContactState | null,
  formData: FormData,
): Promise<PayoutContactState> {
  const method = String(formData.get('method') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!method) return { error: 'method requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  // Log into a generic table — until we add PayoutRequest we just send an email
  // to the platform inbox via Resend so ops can pick it up.
  const { sendEmail } = await import('@/lib/email/resend');
  const inbox =
    process.env.PAYOUTS_INBOX_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    'no-reply@testimona.com';
  await sendEmail({
    to: inbox,
    subject: `[Payout request] ${userData.user.email ?? userData.user.id}`,
    html: `
      <p><strong>User:</strong> ${userData.user.email ?? userData.user.id}</p>
      <p><strong>Method:</strong> ${method}</p>
      <p><strong>Note:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${note || '(none)'}</pre>
    `,
  });
  return { ok: true };
}

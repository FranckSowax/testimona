'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export interface ForgotPasswordState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState | null,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const raw = { email: String(formData.get('email') ?? '') };
  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/dashboard/profile`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

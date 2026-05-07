'use server';

import { LoginEmailSchema } from '@testimona/shared';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface LoginActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(
  _prev: LoginActionState | null,
  formData: FormData,
): Promise<LoginActionState> {
  const raw = {
    loginType: 'Site' as const,
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = LoginEmailSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function loginWithGoogleAction(_formData: FormData): Promise<void> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error || !data.url) {
    const message = encodeURIComponent(error?.message ?? 'oauth init failed');
    redirect(`/login?error=${message}`);
  }
  redirect(data.url);
}

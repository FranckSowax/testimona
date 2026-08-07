'use server';

import { LoginEmailSchema } from '@testimona/shared';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface LoginActionState {
  ok?: boolean;
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

  // Neither `redirect()` nor `revalidatePath()` here, on purpose:
  //
  // - `redirect()` from a Server Action keeps the intercepting `@modal` slot
  //   mounted on Next.js 15, leaving the login modal up with a stuck spinner.
  // - `revalidatePath('/', 'layout')` made Next re-render the still-mounted
  //   login modal against the brand-new session, which is what crashed the
  //   client router ("Application error: a client-side exception has
  //   occurred") on every fresh sign-in.
  //
  // The client turns `ok` into a full document navigation instead, which
  // re-renders every layout server-side with the new session cookie — so
  // there is nothing left for a revalidation to fix.
  return { ok: true };
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

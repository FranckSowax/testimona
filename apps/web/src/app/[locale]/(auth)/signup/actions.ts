'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { sendEmail, welcomeEmail } from '@/lib/email/resend';

const SignupFormSchema = z.object({
  email: z.string().email().toLowerCase().max(100),
  password: z.string().min(8).max(200),
  nickname: z.string().min(1).max(50),
});

export interface SignupActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** True when Supabase requires the user to confirm their email first (G2). */
  confirmEmail?: boolean;
}

export async function signupAction(
  _prev: SignupActionState | null,
  formData: FormData,
): Promise<SignupActionState> {
  const parsed = SignupFormSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    nickname: String(formData.get('nickname') ?? ''),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: { nickname: parsed.data.nickname },
    },
  });

  if (error) return { error: error.message };

  // When "Confirm email" is enabled in Supabase Auth, signUp returns no
  // session — the user must click the confirmation link first (G2).
  const confirmEmail = !data.session;

  // Fire-and-forget welcome email. Failures are swallowed by sendEmail so a
  // flaky provider can never break the signup flow.
  void sendEmail(
    welcomeEmail({
      to: parsed.data.email,
      displayName: parsed.data.nickname,
      locale: 'fr',
    }),
  );

  // Don't redirect from the server action — the intercepting-route @modal
  // slot stays mounted across server-side redirects on Next.js 15.
  return { success: true, confirmEmail };
}

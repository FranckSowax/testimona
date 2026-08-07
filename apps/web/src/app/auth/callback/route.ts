/**
 * Supabase OAuth callback handler.
 *
 * Receives a `code` from the provider (Google, etc.) and exchanges it for a
 * session via Supabase Auth. On success, redirects to ?next or /dashboard.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/redirect-target';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  // Sanitised: `${origin}${next}` with an unchecked `next` is an open redirect
  // (`?next=@evil.com` → `https://our-host@evil.com`).
  const next = safeNextPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

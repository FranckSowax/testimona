import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();

  const headers = request.headers;
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto');
  const host = forwardedHost ?? headers.get('host');
  const proto = forwardedProto ?? (host?.startsWith('localhost') ? 'http' : 'https');

  const baseUrl = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin);

  const url = new URL('/login', baseUrl);
  return NextResponse.redirect(url, { status: 303 });
}

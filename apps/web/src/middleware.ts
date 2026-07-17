/**
 * Next.js middleware: handles i18n locale (next-intl) + Supabase session +
 * auth-required route gates.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

interface CookiePayload {
  name: string;
  value: string;
  options?: CookieOptions;
}

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

function isProtected(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return PROTECTED_PREFIXES.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

function isAdmin(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return stripped === '/admin' || stripped.startsWith('/admin/');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Routes outside i18n: API + Supabase auth callback/signout + sitemap/robots/favicon
  const skipIntl =
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico';

  let response = skipIntl ? NextResponse.next({ request: req }) : intlMiddleware(req);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookiePayload[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() refreshes the access token when it's expired. If the stored
  // refresh token is stale/invalid (e.g. after a Supabase session reset), the
  // refresh throws `AuthApiError: refresh_token_not_found`. Treat that as a
  // logged-out request and purge the stale `sb-*` cookies so the browser stops
  // replaying the bad token on every subsequent request.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  let staleAuth = false;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    staleAuth = true;
  }

  function withAuthCleanup(res: NextResponse): NextResponse {
    if (staleAuth) {
      for (const cookie of req.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) res.cookies.delete(cookie.name);
      }
    }
    return res;
  }

  if (!user && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return withAuthCleanup(NextResponse.redirect(url));
  }

  if (isAdmin(pathname) && user) {
    const role = (user.app_metadata as { role?: string } | null | undefined)?.role;
    if (role !== 'Admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return withAuthCleanup(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

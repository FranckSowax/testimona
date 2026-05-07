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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin(pathname) && user) {
    const role = (user.app_metadata as { role?: string } | null | undefined)?.role;
    if (role !== 'Admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

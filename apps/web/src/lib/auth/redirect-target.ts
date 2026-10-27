/**
 * Helpers for the `?next=` post-authentication redirect target.
 *
 * These run on the client too (LoginForm / SignupForm navigate with
 * `window.location`), so they must not import anything server-only.
 */
import { routing } from '@/i18n/routing';

const locales = routing.locales as readonly string[];
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const PROBE_ORIGIN = 'https://x.invalid';

/**
 * Sanitises a `next=` query param before it is used as a navigation target.
 *
 * Only same-origin absolute paths pass. Everything else falls back: absolute
 * URLs (`https://evil.com`), protocol-relative ones (`//evil.com`), their
 * backslash variant (`/\evil.com`, which several browsers normalise to `//`),
 * the userinfo trick (`@evil.com`, which turns `${origin}${next}` into
 * `https://our-host@evil.com`), and anything carrying control characters
 * (`/\t/evil.com`: browsers strip tab/CR/LF, leaving `//evil.com`).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/')) return fallback;
  if (next.length > 1 && (next[1] === '/' || next[1] === '\\')) return fallback;
  // WHY: les navigateurs retirent tab/CR/LF des URL, donc `/\t/evil.com` devient `//evil.com`.
  if (CONTROL_CHARS.test(next)) return fallback;
  // WHY: filet de sécurité : la cible doit rester sur notre origine une fois résolue.
  try {
    if (new URL(next, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return fallback;
  } catch {
    return fallback;
  }
  return next;
}

/**
 * Prefixes a path with the active locale, mirroring the routing config's
 * `localePrefix: 'as-needed'` (the default locale stays unprefixed).
 *
 * Needed because the auth forms navigate with `window.location` rather than
 * the next-intl router, which would add the prefix on our behalf. Paths that
 * already carry the prefix — the middleware puts the full pathname in `next=`
 * — are left alone.
 */
export function localizedPath(path: string, locale: string): string {
  if (!locales.includes(locale) || locale === routing.defaultLocale) return path;
  const prefix = `/${locale}`;
  if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
    return path;
  }
  return `${prefix}${path}`;
}

/**
 * Where a successful sign-in lands, derived from the login screen's own query
 * string. Shared by `LoginForm` and the `@modal/(.)login` slot so both agree
 * on the destination when they happen to fire at the same moment.
 */
export function loginSuccessTarget(
  params: { next?: string | null; welcome?: string | null },
  locale: string,
): string {
  let target = safeNextPath(params.next);
  if (params.welcome === '1') {
    target += target.includes('?') ? '&welcome=1' : '?welcome=1';
  }
  return localizedPath(target, locale);
}

/**
 * Appends the (sanitised) `next` target to an auth screen path, so that
 * switching between sign-in and sign-up keeps the visitor's destination.
 *
 * @example withNextParam('/signup', '/invitation/abc') // '/signup?next=%2Finvitation%2Fabc'
 */
export function withNextParam(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next, '');
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}

/**
 * `/auth/callback` URL carrying the (sanitised) `next` target, so that email
 * confirmation and OAuth sign-ins land back where the visitor was headed
 * (e.g. an invitation) instead of on the dashboard.
 */
export function authCallbackUrl(siteUrl: string, next: string | null | undefined): string {
  const safe = safeNextPath(next, '');
  const base = `${siteUrl}/auth/callback`;
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

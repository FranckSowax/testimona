/**
 * Helpers for the `?next=` post-authentication redirect target.
 *
 * These run on the client too (LoginForm / SignupForm navigate with
 * `window.location`), so they must not import anything server-only.
 */
import { routing } from '@/i18n/routing';

const locales = routing.locales as readonly string[];

/**
 * Sanitises a `next=` query param before it is used as a navigation target.
 *
 * Only same-origin absolute paths pass. Everything else falls back: absolute
 * URLs (`https://evil.com`), protocol-relative ones (`//evil.com`), their
 * backslash variant (`/\evil.com`, which several browsers normalise to `//`),
 * and the userinfo trick (`@evil.com`, which turns `${origin}${next}` into
 * `https://our-host@evil.com`).
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!next || !next.startsWith('/')) return fallback;
  if (next.length > 1 && (next[1] === '/' || next[1] === '\\')) return fallback;
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

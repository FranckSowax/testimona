/**
 * Public base URL of the site, without trailing slash. Same fallback as the
 * transactional emails so that links built server-side are always absolute.
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://testimona.com').replace(/\/+$/, '');
}

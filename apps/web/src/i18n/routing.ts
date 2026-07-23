import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  // No cookie/Accept-Language guessing: an unprefixed URL is ALWAYS French.
  // With detection on, a stale NEXT_LOCALE=en cookie made the middleware
  // redirect unprefixed (French) links back to /en — the "site flips to
  // English when I click a memorial" bug. All internal links are locale-aware,
  // so explicit prefixes fully determine the language.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

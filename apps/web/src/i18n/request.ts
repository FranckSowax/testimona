import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const locales = routing.locales as readonly string[];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && locales.includes(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

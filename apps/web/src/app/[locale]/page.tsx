import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <>
      <section
        className="relative overflow-hidden bg-surface"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(240,242,255,0.55), rgba(240,242,255,0.92)), url(/images/home-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('lead')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                {t('ctaCreate')}
              </Link>
              <Link
                href="/search"
                className="rounded-md border-2 border-foreground/80 px-5 py-3 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
              >
                {t('ctaSearch')}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex md:justify-center">
            <Image
              src="/images/dove.svg"
              alt=""
              width={360}
              height={360}
              priority
              className="h-72 w-auto opacity-90"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('featuresTitle')}
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureTestimonialsTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('featureTestimonialsDesc')}</p>
          </li>
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureBiographyTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('featureBiographyDesc')}</p>
          </li>
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureDonationsTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('featureDonationsDesc')}</p>
          </li>
        </ul>
      </section>
    </>
  );
}

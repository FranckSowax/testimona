import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppSidebar } from '@/components/AppSidebar';
import { HomeFeed } from '@/components/home/HomeFeed';
import { RipSuggestions } from '@/components/home/RipSuggestions';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, user] = await Promise.all([getTranslations('home'), getCurrentUser()]);

  if (user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AppSidebar />
            </div>
          </aside>

          <main className="min-w-0">
            <HomeFeed />
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <RipSuggestions />
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-mesh">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 lg:py-24">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('lead')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup?next=/dashboard/new"
                className={buttonClasses({ variant: 'primary', size: 'lg' })}
              >
                {t('ctaTestimonial')}
              </Link>
              <Link
                href="/search"
                className={buttonClasses({
                  variant: 'secondary',
                  styleVariant: 'outline',
                  size: 'lg',
                })}
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
              className="scroll-parallax-slow h-72 w-auto opacity-90 animate-pop-in"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('featuresTitle')}
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureTestimonialsTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('featureTestimonialsDesc')}
            </p>
          </Card>
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureBiographyTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('featureBiographyDesc')}
            </p>
          </Card>
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t('featureDonationsTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('featureDonationsDesc')}
            </p>
          </Card>
        </ul>
      </section>
    </>
  );
}

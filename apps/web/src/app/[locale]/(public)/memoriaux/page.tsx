import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppSidebar } from '@/components/AppSidebar';
import { HomeFeed } from '@/components/home/HomeFeed';
import { RipSuggestions } from '@/components/home/RipSuggestions';
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks';
import { HomeTrust } from '@/components/home/HomeTrust';
import { HomeFaq } from '@/components/home/HomeFaq';
import { HomeFinalCta } from '@/components/home/HomeFinalCta';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
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

          <main className="min-w-0 space-y-6">
            {/* PDF p6 — « Create a memorial » must be available at the top of home. */}
            <div className="flex justify-end">
              <Link
                href="/dashboard/new"
                className={buttonClasses({ variant: 'accent', size: 'md' })}
              >
                {t('ctaCreateMemorial')}
              </Link>
            </div>
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
      {/* Hero V2 — sky/clouds background, split slogan with script accent */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/home-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          <div className="animate-fade-in-up space-y-1">
            <p className="font-display text-3xl font-normal leading-tight text-white drop-shadow-sm sm:text-4xl">
              {t('heroSloganStart')}
            </p>
            <p
              className="text-foreground -rotate-1 text-5xl leading-none sm:text-7xl"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              {t('heroSloganScript')}
            </p>
            <p className="font-display text-2xl font-normal leading-tight text-white drop-shadow-sm sm:text-3xl">
              {t('heroSloganEnd1')}
            </p>
            <p className="font-display text-2xl font-normal leading-tight text-white drop-shadow-sm sm:text-3xl">
              {t('heroSloganEnd2')}
            </p>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/signup?next=/dashboard/new"
              className={buttonClasses({ variant: 'accent', size: 'lg' })}
            >
              {t('ctaTestimonial')}
            </Link>
            <Link
              href="/signup?next=/dashboard/new"
              className={buttonClasses({
                variant: 'secondary',
                styleVariant: 'outline',
                size: 'lg',
              })}
            >
              {t('ctaCreateMemorial')}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — 3 steps explaining the user journey */}
      <HomeHowItWorks />

      {/* Recent Testimonials — split title + decorative quotes */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            <p className="font-display text-foreground text-3xl font-medium">
              {t('recentTitleStart')}
            </p>
            <p
              className="text-foreground -rotate-2 text-5xl leading-none"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              {t('recentTitleScript')}
            </p>
          </div>
          <blockquote className="text-muted-foreground relative px-12 italic leading-relaxed">
            <span
              aria-hidden="true"
              className="text-foreground/20 absolute -left-2 -top-4 text-7xl leading-none"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              &ldquo;
            </span>
            {t('recentLead')}
            <span
              aria-hidden="true"
              className="text-foreground/20 absolute -bottom-8 -right-2 text-7xl leading-none"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              &rdquo;
            </span>
          </blockquote>
        </div>
      </section>

      {/* Features cards (kept for marketing) */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="font-display text-foreground text-2xl font-semibold">
          {t('featuresTitle')}
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-foreground text-lg font-semibold">
              {t('featureTestimonialsTitle')}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">{t('featureTestimonialsDesc')}</p>
          </Card>
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-foreground text-lg font-semibold">
              {t('featureBiographyTitle')}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">{t('featureBiographyDesc')}</p>
          </Card>
          <Card as="li" elevation="raised" className="p-6">
            <h3 className="font-display text-foreground text-lg font-semibold">
              {t('featureDonationsTitle')}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">{t('featureDonationsDesc')}</p>
          </Card>
        </ul>
      </section>

      {/* Trust signals — free / privacy / secure */}
      <HomeTrust />

      {/* FAQ — common questions for first-time visitors */}
      <HomeFaq />

      {/* Final CTA — large signup banner */}
      <HomeFinalCta />
    </>
  );
}

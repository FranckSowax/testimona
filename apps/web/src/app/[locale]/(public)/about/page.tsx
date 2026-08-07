import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  return { title: t('title'), description: t('lead') };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const tHome = await getTranslations('home');

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
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-sm font-medium uppercase tracking-widest text-primary">
              Testimona
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('lead')}
            </p>
          </div>
          <div className="hidden md:flex md:justify-center">
            <Image
              src="/images/dove.svg"
              alt=""
              width={320}
              height={320}
              priority
              className="h-64 w-auto opacity-90"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-white p-8 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {t('definitionTitle')}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t('definitionBody')}</p>
          </article>
          <article className="rounded-xl border border-border bg-white p-8 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {t('visionTitle')}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t('visionBody')}</p>
          </article>
          <article className="rounded-xl border border-border bg-white p-8 shadow-sm">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {t('missionTitle')}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t('missionBody')}</p>
          </article>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {t('howTitle')}
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: t('howStep1Title'), body: t('howStep1Body') },
              { title: t('howStep2Title'), body: t('howStep2Body') },
              { title: t('howStep3Title'), body: t('howStep3Body') },
            ].map((step) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('contactTitle')}
        </h2>
        <p className="mt-3 text-muted-foreground">{t('contactBody')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            {tHome('ctaTestimonial')}
          </Link>
          <Link
            href="/search"
            className="rounded-md border-2 border-foreground/80 px-5 py-3 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
          >
            {tHome('ctaSearch')}
          </Link>
        </div>
      </section>
    </>
  );
}

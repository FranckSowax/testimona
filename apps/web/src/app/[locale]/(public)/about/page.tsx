import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  return { title: t('title'), description: t('lead') };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const tHome = await getTranslations('home');

  return (
    <>
      <section
        className="bg-surface relative overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(240,242,255,0.55), rgba(240,242,255,0.92)), url(/images/home-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-primary text-sm font-medium uppercase tracking-widest">
              Testimona
            </p>
            <h1 className="font-display text-foreground mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
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
          <article className="border-border rounded-xl border bg-white p-8 shadow-sm">
            <h2 className="font-display text-foreground text-2xl font-semibold">
              {t('definitionTitle')}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{t('definitionBody')}</p>
          </article>
          <article className="border-border rounded-xl border bg-white p-8 shadow-sm">
            <h2 className="font-display text-foreground text-2xl font-semibold">
              {t('visionTitle')}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{t('visionBody')}</p>
          </article>
          <article className="border-border rounded-xl border bg-white p-8 shadow-sm">
            <h2 className="font-display text-foreground text-2xl font-semibold">
              {t('missionTitle')}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{t('missionBody')}</p>
          </article>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-foreground text-3xl font-semibold tracking-tight">
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
                className="border-border rounded-xl border bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-foreground text-lg font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-foreground text-2xl font-semibold">{t('contactTitle')}</h2>
        <p className="text-muted-foreground mt-3">{t('contactBody')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground rounded-md px-5 py-3 font-medium shadow-sm transition-opacity hover:opacity-90"
          >
            {tHome('ctaTestimonial')}
          </Link>
          <Link
            href="/search"
            className="border-foreground/80 text-foreground rounded-md border-2 px-5 py-3 font-medium opacity-80 transition-opacity hover:opacity-100"
          >
            {tHome('ctaSearch')}
          </Link>
        </div>
      </section>
    </>
  );
}

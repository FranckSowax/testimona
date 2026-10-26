import { getTranslations } from 'next-intl/server';

export async function HomeHowItWorks() {
  const t = await getTranslations('home.howItWorks');

  const steps = [
    { num: 1, title: t('step1Title'), body: t('step1Body') },
    { num: 2, title: t('step2Title'), body: t('step2Body') },
    { num: 3, title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <header className="mx-auto max-w-2xl text-center">
        <h2
          id="how-it-works-heading"
          className="font-display text-foreground text-3xl font-semibold sm:text-4xl"
        >
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t('subtitle')}</p>
      </header>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.num}
            className="border-border relative rounded-lg border bg-white p-6 shadow-[var(--shadow-card)]"
          >
            <span
              aria-hidden="true"
              className="bg-primary/10 font-display text-primary inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
            >
              {step.num}
            </span>
            <h3 className="font-display text-foreground mt-4 text-lg font-bold">{step.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

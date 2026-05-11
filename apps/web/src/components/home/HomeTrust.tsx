import { getTranslations } from 'next-intl/server';

export async function HomeTrust() {
  const t = await getTranslations('home.trust');

  const items = [
    {
      title: t('freeTitle'),
      body: t('freeBody'),
      iconPath: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
    {
      title: t('privacyTitle'),
      body: t('privacyBody'),
      iconPath:
        'M12 2 4 6v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V6l-8-4ZM9 12l2 2 4-4',
    },
    {
      title: t('secureTitle'),
      body: t('secureBody'),
      iconPath:
        'M5 11V8a7 7 0 1 1 14 0v3M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
    },
  ];

  return (
    <section
      aria-labelledby="trust-heading"
      className="bg-surface py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2
            id="trust-heading"
            className="font-display text-3xl font-semibold text-foreground sm:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </header>

        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-lg bg-white p-6 text-center shadow-[var(--shadow-card)]"
            >
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.iconPath} />
                </svg>
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

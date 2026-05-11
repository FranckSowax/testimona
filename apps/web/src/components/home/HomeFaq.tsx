import { getTranslations } from 'next-intl/server';

export async function HomeFaq() {
  const t = await getTranslations('home.faq');

  const items = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
  ];

  return (
    <section
      aria-labelledby="faq-heading"
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <header className="text-center">
        <h2
          id="faq-heading"
          className="font-display text-3xl font-semibold text-foreground sm:text-4xl"
        >
          {t('title')}
        </h2>
      </header>

      <ul className="mt-10 divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {items.map((item, i) => (
          <li key={i}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-base font-bold text-foreground transition-colors hover:bg-surface">
                <span>{item.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-150 group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

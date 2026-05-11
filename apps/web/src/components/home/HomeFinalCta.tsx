import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';

export async function HomeFinalCta() {
  const t = await getTranslations('home.finalCta');

  return (
    <section aria-labelledby="final-cta-heading" className="bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2
          id="final-cta-heading"
          className="font-display text-3xl font-bold sm:text-4xl"
        >
          {t('title')}
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-white/85">{t('subtitle')}</p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup?next=/dashboard/new"
            className={buttonClasses({ variant: 'accent', size: 'lg' })}
          >
            {t('button')}
          </Link>
          <Link
            href="/login"
            className="font-display text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline"
          >
            {t('secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}

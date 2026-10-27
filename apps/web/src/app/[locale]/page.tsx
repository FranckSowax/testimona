import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import { buttonClasses } from '@/components/ui/Button';
import { listMyDossiers } from '@/modules/dossier/repo';
import { EntryDoors } from '@/modules/dossier/ui/EntryDoors';
import { MyDossiers } from '@/modules/dossier/ui/MyDossiers';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, user] = await Promise.all([getTranslations('doors'), getCurrentUser()]);
  const dossiers = user ? await listMyDossiers() : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:py-16">
      {/* Spec : connecté, « Mes dossiers » d'abord, puis les portes ; le DOM commence par le h1. */}
      <div className="space-y-3">
        <h1 className="font-display text-foreground text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl">{t('lead')}</p>
      </div>
      {dossiers.length > 0 && <MyDossiers dossiers={dossiers} />}
      <EntryDoors titleVisible={dossiers.length > 0} />
      <section aria-labelledby="search-title" className="border-border space-y-4 border-t pt-8">
        <h2 id="search-title" className="font-display text-foreground text-xl font-semibold">
          {t('searchTitle')}
        </h2>
        <form
          role="search"
          action={localizedPath('/search', locale)}
          method="get"
          className="flex flex-wrap gap-3"
        >
          <label htmlFor="home-search" className="sr-only">
            {t('searchPlaceholder')}
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder={t('searchPlaceholder')}
            className="border-border bg-background text-foreground min-w-0 flex-1 rounded-full border px-4 py-2"
          />
          <button type="submit" className={buttonClasses({ variant: 'primary', size: 'md' })}>
            {t('searchSubmit')}
          </button>
        </form>
        <Link href="/memoriaux" className="text-primary text-sm font-semibold hover:underline">
          {t('browseMemorials')}
        </Link>
      </section>
    </div>
  );
}

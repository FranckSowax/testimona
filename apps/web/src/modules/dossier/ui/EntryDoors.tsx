import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const DOORS = [
  { key: 'death', porte: 'deces', highlight: true },
  { key: 'prepare', porte: 'preparer', highlight: false },
  { key: 'after', porte: null, highlight: false },
] as const;

export async function EntryDoors() {
  const t = await getTranslations('doors');
  return (
    <section aria-labelledby="doors-title" className="space-y-6">
      <div className="space-y-3">
        <h1
          id="doors-title"
          className="font-display text-foreground text-balance text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl">{t('lead')}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {DOORS.map((door) => {
          const body = (
            <>
              <span className="font-display text-foreground block text-lg font-semibold">
                {t(`${door.key}.title`)}
              </span>
              <span className="text-muted-foreground mt-2 block text-sm">
                {t(`${door.key}.desc`)}
              </span>
            </>
          );
          const base = 'block h-full rounded-2xl border p-5 transition-colors';
          return (
            <li key={door.key}>
              {door.porte ? (
                <Link
                  href={`/dossier/nouveau?porte=${door.porte}`}
                  className={`${base} ${
                    door.highlight
                      ? 'border-accent bg-bg-hover-pink hover:bg-bg-active-pink'
                      : 'border-border bg-background hover:bg-surface'
                  }`}
                >
                  {body}
                </Link>
              ) : (
                <div aria-disabled="true" className={`${base} border-border bg-muted opacity-70`}>
                  {body}
                  <span className="text-primary mt-3 block text-xs font-semibold uppercase tracking-wide">
                    {t('soon')}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

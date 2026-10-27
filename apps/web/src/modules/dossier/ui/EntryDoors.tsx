import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const DOORS = [
  { key: 'death', porte: 'deces', highlight: true },
  { key: 'prepare', porte: 'preparer', highlight: false },
  { key: 'after', porte: null, highlight: false },
] as const;

/**
 * Grille des portes d'entrée (décès, préparer, après). Le titre de page et le chapeau
 * vivent dans la page d'accueil, pour que « Mes dossiers » puisse s'intercaler avant.
 *
 * @example <EntryDoors titleVisible={dossiers.length > 0} />
 */
export async function EntryDoors({ titleVisible = false }: { titleVisible?: boolean }) {
  const t = await getTranslations('doors');
  return (
    <section aria-labelledby="doors-start-title" className="space-y-4">
      {/* WHY: un h2 garde la hiérarchie sous le h1 ; visible seulement s'il suit « Mes dossiers ». */}
      <h2
        id="doors-start-title"
        className={titleVisible ? 'font-display text-foreground text-xl font-semibold' : 'sr-only'}
      >
        {t('startTitle')}
      </h2>
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
                <div className={`${base} border-border bg-background border-dashed`}>
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

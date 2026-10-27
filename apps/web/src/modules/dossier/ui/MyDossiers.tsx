import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { DossierSummary } from '../repo';

export async function MyDossiers({ dossiers }: { dossiers: DossierSummary[] }) {
  const t = await getTranslations('dossier');
  return (
    <section aria-labelledby="my-dossiers-title" className="space-y-4">
      <h2 id="my-dossiers-title" className="font-display text-foreground text-xl font-semibold">
        {t('myDossiers')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {dossiers.map((d) => (
          <li key={d.id}>
            <Link
              href={`/dossier/${d.id}`}
              className="border-border bg-background hover:bg-surface block rounded-xl border p-4"
            >
              <span className="font-display text-foreground block font-semibold">{d.title}</span>
              <span className="text-muted-foreground text-sm">{t('inCity', { city: d.city })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

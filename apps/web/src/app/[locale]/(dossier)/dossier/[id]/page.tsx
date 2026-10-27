import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { getDossier, getPerson, listMembers } from '@/modules/dossier/repo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function DossierPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [t, dossier] = await Promise.all([getTranslations('dossier'), getDossier(id)]);
  if (!dossier) notFound();
  const [person, members] = await Promise.all([getPerson(id), listMembers(id)]);
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(dossier.countryCode);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-1">
        <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
          {person ? `${person.firstName} ${person.lastName}` : dossier.title}
        </h1>
        <p className="text-muted-foreground">
          {t('inCity', { city: dossier.city })}
          {country ? ` · ${country}` : ''}
        </p>
      </header>

      <section className="bg-secondary text-secondary-foreground rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">{t('overview.journeyTitle')}</h2>
        <p className="mt-2 text-white/80">{t('overview.journeySoon')}</p>
      </section>

      <section className="border-border space-y-3 rounded-2xl border p-6">
        <h2 className="font-display text-foreground text-lg font-semibold">
          {t('overview.membersTitle')}
        </h2>
        <p className="text-muted-foreground">
          {t('overview.membersCount', { count: members.length })}
        </p>
        <Link
          href={`/dossier/${id}/membres`}
          className={buttonClasses({ variant: 'primary', size: 'md' })}
        >
          {t('overview.manageMembers')}
        </Link>
      </section>
    </div>
  );
}

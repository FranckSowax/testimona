import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { personStatus, stepsFor } from '@/journey/registry';
import { JourneyOverview } from '@/journey/ui/JourneyOverview';
import { listAnswers } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPerson, listMembers } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';

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
  const [person, members, answers, role] = await Promise.all([
    getPerson(id),
    listMembers(id),
    listAnswers(id),
    getMyRole(id),
  ]);
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

      <section className="space-y-4">
        <h2 className="font-display text-foreground text-lg font-semibold">
          {t('overview.journeyTitle')}
        </h2>
        <JourneyOverview
          dossierId={id}
          steps={stepsFor(dossier.entryPoint)}
          answers={answers}
          name={person?.firstName ?? dossier.title}
          status={personStatus(dossier.entryPoint)}
          canAnswer={canWrite(role)}
        />
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

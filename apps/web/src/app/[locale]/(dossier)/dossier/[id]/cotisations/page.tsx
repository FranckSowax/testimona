import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { isStepOpen } from '@/journey/registry';
import { canManageLedger, contributionsView } from '@/modules/budget/ledger/contributions-view';
import { entryViews } from '@/modules/budget/ledger/model';
import { getTotals, getVisibility, listEntries } from '@/modules/budget/ledger/repo';
import { EntryForms } from '@/modules/budget/ledger/ui/EntryForms';
import { EntryList } from '@/modules/budget/ledger/ui/EntryList';
import { LedgerSummary } from '@/modules/budget/ledger/ui/LedgerSummary';
import { VisibilityForm } from '@/modules/budget/ledger/ui/VisibilityForm';
import { ATTENDANCE_KEYS, envisagedTotal, LEVEL_KEY, NIGHTS_KEY } from '@/modules/budget/scenarios';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, listMembers } from '@/modules/dossier/repo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function ContributionsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  // WHY: le rôle est lu avec le dossier, avant le reste, pour ne lire les membres que s'ils
  // serviront (trésorier et au-delà).
  const [dossier, role] = await Promise.all([getDossier(id), getMyRole(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [t, tEntry, totals, entries, visibility, answers, members] = await Promise.all([
    getTranslations('ledger.page'),
    getTranslations('ledger.entry'),
    getTotals(id),
    listEntries(id),
    getVisibility(id),
    listAnswersResult(id, [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY]),
    // WHY: listMembers journalise ses erreurs et renvoie [] ; la saisie reste possible avec
    // « Autre personne », rien de faux n'est affiché.
    canManageLedger(role) ? listMembers(id) : Promise.resolve([]),
  ]);
  // WHY: des totaux ou des lignes faux seraient pires qu'un écran d'erreur ; error.tsx prend le relais.
  if (totals.error || entries.error || visibility.error || answers.error) {
    throw new Error('ledger unreadable');
  }

  const views = entryViews(entries.data);
  const { canPledge, canManage, isOwner, memberOptions, pledgeOptions } = contributionsView({
    role,
    views,
    members,
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('title')}</h1>
        <p className="text-foreground">{t('intro')}</p>
        <p className="text-foreground text-sm">
          {visibility.data === 'members' ? t('membersNote') : t('restrictedNote')}
        </p>
      </header>

      <LedgerSummary locale={locale} budget={envisagedTotal(answers.data)} totals={totals.data} />

      <EntryForms
        dossierId={id}
        locale={locale}
        canPledge={canPledge}
        canManage={canManage}
        members={memberOptions}
        pledges={pledgeOptions}
      />

      <section aria-labelledby="entries-title" className="space-y-3">
        <h2 id="entries-title" className="font-display text-foreground text-lg font-semibold">
          {tEntry('listTitle')}
        </h2>
        <EntryList dossierId={id} locale={locale} views={views} canManage={canManage} />
      </section>

      {isOwner && <VisibilityForm dossierId={id} visibility={visibility.data} />}

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link
          href={`/dossier/${id}/budget`}
          className="text-secondary font-semibold underline underline-offset-2"
        >
          {t('seeBudget')}
        </Link>
        <Link href={`/dossier/${id}`} className="text-foreground underline underline-offset-2">
          ← {t('backToDossier')}
        </Link>
      </div>
    </div>
  );
}

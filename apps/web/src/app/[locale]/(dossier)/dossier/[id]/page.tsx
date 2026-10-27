import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { isStepOpen, personStatus, stepsFor } from '@/journey/registry';
import { JourneyOverview } from '@/journey/ui/JourneyOverview';
import { getTotals } from '@/modules/budget/ledger/repo';
import { LedgerCard } from '@/modules/budget/ledger/ui/LedgerCard';
import { referenceBudget } from '@/modules/budget/lines/model';
import { getScenario, listLines } from '@/modules/budget/lines/repo';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
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
  const hasBudget = isStepOpen(dossier.entryPoint, 'attendance');
  // WHY: une carte sans chiffre vaut mieux qu'un tableau de bord en erreur ; la page Cotisations,
  // elle, refuse d'afficher des totaux illisibles.
  const [person, members, answersResult, role, ledgerTotals, lines, scenario] = await Promise.all([
    getPerson(id),
    listMembers(id),
    listAnswersResult(id),
    getMyRole(id),
    hasBudget ? getTotals(id).then((result) => result.data) : null,
    hasBudget ? listLines(id) : null,
    hasBudget ? getScenario(id) : null,
  ]);
  // WHY: si les postes ou le scénario sont illisibles, la carte dit « momentanément
  // indisponibles » plutôt que d'afficher un budget faux (envisagé au lieu de retenu, ou aucun).
  // WHY: les réponses servent aussi au parcours, qui s'affiche avec un objet vide en cas d'échec.
  const answers = answersResult.data;
  const budgetReadable =
    answersResult.error === null &&
    lines !== null &&
    scenario !== null &&
    !lines.error &&
    !scenario.error;
  const country = new Intl.DisplayNames([locale], { type: 'region' }).of(dossier.countryCode);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-1">
        <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
          {person ? `${person.firstName} ${person.lastName}` : dossier.title}
        </h1>
        <p className="text-foreground">
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

      {hasBudget && (
        <LedgerCard
          dossierId={id}
          locale={locale}
          budget={budgetReadable ? referenceBudget(scenario.data, lines.data, answers) : null}
          totals={budgetReadable ? ledgerTotals : null}
        />
      )}

      <section className="border-border space-y-3 rounded-2xl border p-6">
        <h2 className="font-display text-foreground text-lg font-semibold">
          {t('overview.membersTitle')}
        </h2>
        <p className="text-foreground">{t('overview.membersCount', { count: members.length })}</p>
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

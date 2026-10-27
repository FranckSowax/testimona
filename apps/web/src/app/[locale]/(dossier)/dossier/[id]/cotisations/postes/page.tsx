import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { LEVELS, type Level } from '@/journey/options';
import { isStepOpen } from '@/journey/registry';
import { formatXaf } from '@/modules/budget/format';
import { canManageLedger } from '@/modules/budget/ledger/contributions-view';
import { lineViews, scenarioTotals, UNASSIGNED_KEY } from '@/modules/budget/lines/model';
import { getScenario, listLines, spentByLine } from '@/modules/budget/lines/repo';
import { LedgerTabs } from '@/modules/budget/lines/ui/LedgerTabs';
import { LineDeletedAnnouncer } from '@/modules/budget/lines/ui/LineDeletedAnnouncer';
import { LinesActions } from '@/modules/budget/lines/ui/LinesActions';
import { LINES_CAPTION_ID, LinesTable } from '@/modules/budget/lines/ui/LinesTable';
import { ScenarioForm } from '@/modules/budget/lines/ui/ScenarioForm';
import { getDossier, getMyRole } from '@/modules/dossier/repo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

/** Message « aucun poste » : ancre de focus après la suppression du dernier poste. */
const EMPTY_ID = 'budget-lines-empty';

export default async function BudgetLinesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [dossier, role] = await Promise.all([getDossier(id), getMyRole(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [t, tLevel, tPage, lines, scenario, spent] = await Promise.all([
    getTranslations('lines'),
    getTranslations('budget.level'),
    getTranslations('ledger.page'),
    listLines(id),
    getScenario(id),
    spentByLine(id),
  ]);
  // WHY: des postes ou des dépenses faux seraient pires qu'un écran d'erreur ; error.tsx prend le relais.
  if (lines.error || scenario.error || spent.error) throw new Error('budget lines unreadable');

  const canManage = canManageLedger(role);
  const views = lineViews(lines.data, spent.data);
  const totals = scenarioTotals(lines.data);
  const formatted = Object.fromEntries(
    LEVELS.map((level) => [level, formatXaf(totals[level], locale)]),
  ) as Record<Level, string>;
  const hasLines = views.length > 0;
  const content = hasLines ? (
    <LinesTable
      dossierId={id}
      locale={locale}
      lines={views}
      scenario={scenario.data}
      unassignedSpent={spent.data.get(UNASSIGNED_KEY) ?? 0}
      canManage={canManage}
    />
  ) : (
    // WHY: ancre de focus seulement pour le gestionnaire, le seul à pouvoir supprimer un poste.
    <p
      id={canManage ? EMPTY_ID : undefined}
      tabIndex={canManage ? -1 : undefined}
      className="text-foreground"
    >
      {canManage ? t('page.emptyManager') : t('page.empty')}
    </p>
  );
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('page.title')}</h1>
        <p className="text-foreground">{t('page.intro')}</p>
        <p className="text-foreground text-sm">{t('page.estimateNote')}</p>
      </header>

      <LedgerTabs dossierId={id} current="lines" />

      {!canManage && scenario.data && (
        <p className="text-foreground font-semibold">
          {t('scenario.current', { level: tLevel(scenario.data) })}
        </p>
      )}
      {canManage && hasLines && (
        <ScenarioForm dossierId={id} scenario={scenario.data} totals={formatted} />
      )}

      {canManage ? (
        // WHY: l'annonceur entoure le tableau, le message vide et les actions : supprimer le
        // dernier poste démonte le tableau sans perdre l'annonce ni le focus.
        <LineDeletedAnnouncer
          focusId={LINES_CAPTION_ID}
          fallbackFocusId={EMPTY_ID}
          empty={!hasLines}
        >
          {content}
          <LinesActions dossierId={id} hasLines={hasLines} />
        </LineDeletedAnnouncer>
      ) : (
        content
      )}

      <Link
        href={`/dossier/${id}`}
        className="text-secondary text-sm font-semibold underline underline-offset-2"
      >
        ← {tPage('backToDossier')}
      </Link>
    </div>
  );
}

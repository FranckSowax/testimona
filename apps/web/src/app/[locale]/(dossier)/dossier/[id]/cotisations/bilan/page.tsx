import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { isStepOpen } from '@/journey/registry';
import {
  formatClosedOn,
  receivedContributions,
  seesAllAmounts,
  summaryText,
} from '@/modules/budget/closing/model';
import { getClosure } from '@/modules/budget/closing/repo';
import { ClosedNotice } from '@/modules/budget/closing/ui/ClosedNotice';
import { ClosingControl } from '@/modules/budget/closing/ui/ClosingControl';
import { ReceivedList } from '@/modules/budget/closing/ui/ReceivedList';
import { ShareSummary } from '@/modules/budget/closing/ui/ShareSummary';
import { SpentTable } from '@/modules/budget/closing/ui/SpentTable';
import { formatXaf } from '@/modules/budget/format';
import { canManageLedger } from '@/modules/budget/ledger/contributions-view';
import { entryViews } from '@/modules/budget/ledger/model';
import {
  getTotals,
  getVisibility,
  LEDGER_LIST_LIMIT,
  listEntries,
} from '@/modules/budget/ledger/repo';
import { LedgerSummary } from '@/modules/budget/ledger/ui/LedgerSummary';
import { lineViews, referenceBudget, UNASSIGNED_KEY } from '@/modules/budget/lines/model';
import { getScenario, listLines, spentByLine } from '@/modules/budget/lines/repo';
import { LedgerTabs } from '@/modules/budget/lines/ui/LedgerTabs';
import { ATTENDANCE_KEYS, LEVEL_KEY, NIGHTS_KEY } from '@/modules/budget/scenarios';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPersonResult } from '@/modules/dossier/repo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();
const SECTION_TITLE = 'font-display text-foreground text-lg font-semibold';

export default async function ContributionsSummaryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const [dossier, role] = await Promise.all([getDossier(id), getMyRole(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [
    t,
    tShare,
    tLedger,
    totals,
    entries,
    visibility,
    answers,
    lines,
    scenario,
    spent,
    closure,
    person,
  ] = await Promise.all([
    getTranslations('closing.page'),
    getTranslations('closing.share'),
    getTranslations('ledger.page'),
    getTotals(id),
    listEntries(id),
    getVisibility(id),
    listAnswersResult(id, [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY]),
    listLines(id),
    getScenario(id),
    spentByLine(id),
    getClosure(id),
    // WHY: la variante « Result » distingue une erreur de lecture d'une personne absente : le
    // titre du texte partagé ne doit pas perdre le nom en silence.
    getPersonResult(id),
  ]);
  // WHY: un bilan faux serait pire qu'un écran d'erreur ; error.tsx prend le relais.
  if (
    totals.error ||
    entries.error ||
    visibility.error ||
    answers.error ||
    lines.error ||
    scenario.error ||
    spent.error ||
    closure.error ||
    person.error
  ) {
    throw new Error('ledger summary unreadable');
  }

  const budget = referenceBudget(scenario.data, lines.data, answers.data);
  const closedOn = closure.data.closedAt ? formatClosedOn(closure.data.closedAt, locale) : null;
  const canManage = canManageLedger(role);
  // WHY: le texte partagé ne contient que des totaux, visibles de tout membre, et le nom de la
  // personne décédée : aucun nom de contributeur, aucun montant individuel.
  const text = summaryText(
    {
      name: person.data ? `${person.data.firstName} ${person.data.lastName}` : null,
      budget,
      totals: totals.data,
      closedOn,
    },
    (key, values) => tShare(key, values),
    (amount) => formatXaf(amount, locale),
  );
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('title')}</h1>
        <p className="text-foreground">{t('intro')}</p>
      </header>

      <LedgerTabs dossierId={id} current="summary" />

      {closedOn !== null ? (
        <ClosedNotice dossierId={id} closedOn={closedOn} showSummaryLink={false} />
      ) : (
        <p className="text-foreground text-sm">{t('provisional')}</p>
      )}

      <LedgerSummary locale={locale} budget={budget} totals={totals.data} />

      <section aria-labelledby="spent-title" className="space-y-3">
        <h2 id="spent-title" className={SECTION_TITLE}>
          {t('spentTitle')}
        </h2>
        <SpentTable
          locale={locale}
          labelledBy="spent-title"
          lines={lineViews(lines.data, spent.data)}
          unassignedSpent={spent.data.get(UNASSIGNED_KEY) ?? 0}
        />
      </section>

      <section aria-labelledby="received-title" className="space-y-3">
        <h2 id="received-title" className={SECTION_TITLE}>
          {seesAllAmounts(role, visibility.data) ? t('receivedTitleAll') : t('receivedTitleOwn')}
        </h2>
        <ReceivedList locale={locale} views={receivedContributions(entryViews(entries.data))} />
        {/* WHY: `listEntries` s'arrête à LEDGER_LIST_LIMIT lignes ; les totaux, eux, viennent
            de `ledger_totals` et couvrent tout le registre. */}
        {entries.data.length >= LEDGER_LIST_LIMIT && (
          <p className="text-foreground text-sm">
            {t('receivedTruncated', { limit: LEDGER_LIST_LIMIT })}
          </p>
        )}
      </section>

      <ShareSummary text={text} />

      {canManage && (
        <section
          aria-labelledby="export-title"
          className="border-border space-y-2 rounded-2xl border p-4"
        >
          <h2 id="export-title" className={SECTION_TITLE}>
            {t('exportTitle')}
          </h2>
          <p className="text-foreground text-sm">{t('exportHint')}</p>
          {/* WHY: lien simple (pas de <Link> Next, qui préchargerait le fichier) vers la route
              d'export, hors routes localisées ; la route vérifie la session et le rôle. */}
          <a
            href={`/api/dossiers/${id}/ledger-export?lang=${locale === 'en' ? 'en' : 'fr'}`}
            download
            className="text-secondary text-sm font-semibold underline underline-offset-2"
          >
            {t('export')}
          </a>
        </section>
      )}

      {canManage && (
        <ClosingControl dossierId={id} closed={closedOn !== null} canReopen={role === 'owner'} />
      )}

      <Link
        href={`/dossier/${id}`}
        className="text-secondary text-sm font-semibold underline underline-offset-2"
      >
        ← {tLedger('backToDossier')}
      </Link>
    </div>
  );
}

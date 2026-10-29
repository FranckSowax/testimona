import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { ESTIMATE_KEYS, estimateFor, hasEstimate } from '@/journey/quantities';
import { getStep, isStepOpen } from '@/journey/registry';
import { StepSynthesis } from '@/journey/ui/StepSynthesis';
import { getClosure } from '@/modules/budget/closing/repo';
import { canManageLedger } from '@/modules/budget/ledger/contributions-view';
import { type LineAdjustment, lineAdjustments } from '@/modules/budget/lines/model';
import { listLines } from '@/modules/budget/lines/repo';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDeathCity, getDossier, getMyRole } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';
import { panelCity, type PanelGroup } from '@/modules/providers/panel';
import { providersForPanel } from '@/modules/providers/service';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function StepSynthesisPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
}) {
  const { locale, id, stepId } = await params;
  setRequestLocale(locale);
  const step = getStep(stepId);
  if (!IdSchema.safeParse(id).success || !step || step.summary !== 'step') notFound();
  if (!hasEstimate(step.id)) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const keys = [...step.questions.map((question) => question.key), ...ESTIMATE_KEYS];
  const [role, answers, closure, deathCity] = await Promise.all([
    getMyRole(id),
    listAnswersResult(id, keys),
    getClosure(id),
    getDeathCity(id),
  ]);
  // WHY: des quantités nulles sur une lecture en échec seraient trompeuses ; error.tsx prend le
  // relais.
  if (answers.error) throw new Error('step summary answers unreadable');
  const estimate = estimateFor(step.id, answers.data);

  // WHY: ajuster un poste est réservé au trésorier et refusé (TL009) une fois les cotisations
  // clôturées ; une clôture ou des postes illisibles masquent le bouton plutôt que de proposer
  // une écriture refusée.
  let adjustments: LineAdjustment[] | null = null;
  if (estimate && canManageLedger(role) && !closure.error && !closure.data.closedAt) {
    const lines = await listLines(id);
    adjustments = lines.error ? null : lineAdjustments(estimate.costs, lines.data);
  }

  const city = panelCity(deathCity);
  let groups: PanelGroup[] = [];
  if (step.providers) {
    const res = await providersForPanel(step.providers, city);
    // WHY: l'encadré est un complément ; s'il est illisible, la synthèse reste utile sans lui.
    groups = res.ok ? res.data : [];
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <StepSynthesis
        dossierId={id}
        locale={locale}
        stepId={step.id}
        estimate={estimate}
        adjustments={adjustments}
        canAnswer={canWrite(role)}
        panel={{ city, groups }}
      />
    </div>
  );
}

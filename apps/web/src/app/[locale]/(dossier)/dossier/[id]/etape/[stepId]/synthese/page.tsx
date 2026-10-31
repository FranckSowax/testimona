import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
import { canWrite, hasRole } from '@/modules/dossier/roles';
import { panelCity, type PanelGroup } from '@/modules/providers/panel';
import { quoteMessages, quotePlace } from '@/modules/providers/quote-panel';
import { type QuoteHistoryItem, quotesForStep } from '@/modules/providers/quote-service';
import { QUOTE_STEPS, type QuoteStep } from '@/modules/providers/quotes/repo';
import { providersForPanel } from '@/modules/providers/service';
import type { PanelQuote } from '@/modules/providers/ui/ProviderPanel';

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

  // WHY: `vigil.place` (3.1) donne la ville des messages de devis, en 3.2 aussi.
  const keys = [
    ...new Set([
      ...step.questions.map((question) => question.key),
      ...ESTIMATE_KEYS,
      'vigil.place',
    ]),
  ];
  const [role, answers, deathCity] = await Promise.all([
    getMyRole(id),
    listAnswersResult(id, keys),
    getDeathCity(id),
  ]);
  // WHY: des quantités nulles sur une lecture en échec seraient trompeuses ; error.tsx prend le
  // relais.
  if (answers.error) throw new Error('step summary answers unreadable');
  const estimate = estimateFor(step.id, answers.data);

  // WHY: ajuster un poste est réservé au trésorier et refusé (TL009) une fois les cotisations
  // clôturées ; une clôture ou des postes illisibles masquent le bouton plutôt que de proposer
  // une écriture refusée. La clôture n'est lue que pour un trésorier et s'il y a une estimation.
  let adjustments: LineAdjustment[] | null = null;
  if (estimate && canManageLedger(role)) {
    const closure = await getClosure(id);
    if (!closure.error && !closure.data.closedAt) {
      const lines = await listLines(id);
      adjustments = lines.error ? null : lineAdjustments(estimate.costs, lines.data);
    }
  }

  const city = panelCity(deathCity);
  const quoteStep = (QUOTE_STEPS as readonly string[]).includes(step.id)
    ? (step.id as QuoteStep)
    : null;

  // WHY: l'encadré et l'historique sont des compléments ; illisibles, ils sont simplement
  // masqués et la synthèse reste utile sans eux. Les deux lectures sont indépendantes.
  const [panelRes, quotesRes] = await Promise.all([
    step.providers ? providersForPanel(step.providers, city) : null,
    quoteStep ? quotesForStep(id, quoteStep) : null,
  ]);
  const groups: PanelGroup[] = panelRes?.ok ? panelRes.data : [];
  const quotes: QuoteHistoryItem[] = quotesRes?.ok ? quotesRes.data : [];

  // WHY: le bouton n'est proposé qu'à un coordinateur, comme la RLS ; les messages ne sont donc
  // construits que pour lui. Ils suivent la langue de l'interface. La date de la cérémonie
  // viendra avec l'étape 3.4 (PR 4) : « à préciser ». Le numéro reste côté serveur : seuls les
  // messages (sans numéro ni nom du défunt) partent vers le formulaire client.
  let quote: PanelQuote | null = null;
  if (quoteStep && hasRole(role, 'coordinator') && groups.length > 0) {
    const t = await getTranslations();
    const messages = quoteMessages(
      groups,
      {
        place: quotePlace(answers.data['vigil.place'], city),
        date: null,
        quantities: estimate?.quantities ?? [],
      },
      // WHY: `quoteMessage` construit ses clés dynamiquement (`providers.category.${…}`,
      // `journey.synthesis.quantity.${…}`) ; le `t` typé de next-intl n'accepte que des clés
      // littérales. Les clés et leurs paramètres ICU sont vérifiés par `messages.test.ts`.
      (key, values) => t(key as never, values as never),
    );
    if (Object.keys(messages).length > 0) quote = { dossierId: id, stepId: quoteStep, messages };
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
        panel={{ city, groups, quote }}
        quotes={quotes}
      />
    </div>
  );
}

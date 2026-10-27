import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { getStep, isStepOpen } from '@/journey/registry';
import { draftFor, emailSubject, type DraftContext } from '@/journey/templates';
import { DraftEditor } from '@/journey/ui/DraftEditor';
import { listAnswers } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPerson } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function DraftPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
}) {
  const { locale, id, stepId } = await params;
  setRequestLocale(locale);
  const step = getStep(stepId);
  const draft = step?.draft;
  if (!IdSchema.safeParse(id).success || !step || !draft) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const [person, role, answers] = await Promise.all([
    getPerson(id),
    getMyRole(id),
    // WHY: l'annonce par e-mail reprend des réponses d'autres étapes (date, ton).
    listAnswers(id),
  ]);
  const ctx: DraftContext = {
    locale: locale === 'en' ? 'en' : 'fr',
    person: person ?? { firstName: dossier.title, lastName: '', nickname: null },
    answers,
  };
  const generated = draftFor(draft.kind, ctx);
  const stored = answers[draft.key];
  const saved = typeof stored === 'string' && stored.trim() !== '' ? stored : null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <DraftEditor
        dossierId={id}
        stepId={step.id}
        kind={draft.kind}
        initialText={saved ?? generated}
        generatedText={generated}
        initiallySaved={saved !== null}
        subject={draft.kind === 'email' ? emailSubject(ctx) : null}
        readOnly={!canWrite(role)}
      />
    </div>
  );
}

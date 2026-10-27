import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { resolveQuestionIndex } from '@/journey/progress';
import { getStep, isStepOpen, personStatus } from '@/journey/registry';
import { QuestionScreen } from '@/journey/ui/QuestionScreen';
import { listAnswers } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPerson } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';
import { COUNTRY_CODES } from '@/modules/dossier/schema';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function StepPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ locale, id, stepId }, { q }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const step = getStep(stepId);
  if (!IdSchema.safeParse(id).success || !step) notFound();

  const [t, dossier] = await Promise.all([getTranslations('journey'), getDossier(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const keys = step.questions.map((question) => question.key);
  const [person, role, answers] = await Promise.all([
    getPerson(id),
    getMyRole(id),
    listAnswers(id, keys),
  ]);
  const index = resolveQuestionIndex(step, answers, q);
  const question = step.questions[index];
  if (!question) notFound();

  const values = {
    name: person?.firstName ?? dossier.title,
    status: personStatus(dossier.entryPoint),
  };
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRY_CODES.map((code) => ({ code, label: names.of(code) ?? code }));
  const stepPath = `/dossier/${id}/etape/${step.id}`;

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <QuestionScreen
        key={question.key}
        dossierId={id}
        question={question}
        index={index}
        total={step.questions.length}
        title={t(`q.${question.key}.title`, values)}
        hint={t(`q.${question.key}.hint`, values)}
        stored={answers[question.key]}
        readOnly={!canWrite(role)}
        countries={countries}
        backHref={index > 0 ? `${stepPath}?q=${index - 1}` : `/dossier/${id}`}
        nextHref={index + 1 < step.questions.length ? `${stepPath}?q=${index + 1}` : null}
      />
    </div>
  );
}

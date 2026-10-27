import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import {
  ATTENDANCE_KEYS,
  attendanceFrom,
  chosenLevel,
  LEVEL_KEY,
  NIGHTS_KEY,
  scenariosFor,
} from '@/modules/budget/scenarios';
import { BudgetOverview } from '@/modules/budget/ui/BudgetOverview';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [role, answers] = await Promise.all([
    getMyRole(id),
    listAnswersResult(id, [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY]),
  ]);
  // WHY: sur une lecture en échec, des budgets à zéro seraient trompeurs ; error.tsx prend le relais.
  if (answers.error) throw new Error('budget answers unreadable');

  const attendance = attendanceFrom(answers.data);
  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <BudgetOverview
        dossierId={id}
        locale={locale}
        attendance={attendance}
        scenarios={scenariosFor(attendance)}
        chosen={chosenLevel(answers.data)}
        canAnswer={canWrite(role)}
      />
    </div>
  );
}

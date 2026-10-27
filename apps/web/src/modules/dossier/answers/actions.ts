'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { findQuestion } from '@/journey/registry';
import { SKIPPED } from '@/journey/types';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import type { DossierError } from '../service';
import { answerRedirectTarget } from './redirect';
import { listAnswers } from './repo';
import { saveAnswer } from './service';

export interface AnswerState {
  error?: DossierError;
  fieldErrors?: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * Enregistre la réponse (ou « passée » si `intent=skip`) puis passe à la prochaine question non
 * traitée ou passée de l'étape, ou revient au tableau de bord quand il n'en reste aucune.
 */
export async function saveAnswerAction(
  _prev: AnswerState | null,
  formData: FormData,
): Promise<AnswerState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const key = field(formData, 'key');

  let value: unknown = SKIPPED;
  if (field(formData, 'intent') !== 'skip') {
    try {
      value = JSON.parse(field(formData, 'value'));
    } catch {
      return { error: 'validation' };
    }
  }

  const res = await saveAnswer({ dossierId, key, value });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };

  const found = findQuestion(key);
  const locale = await getLocale();
  revalidatePath(localizedPath(`/dossier/${dossierId}`, locale));
  let target = `/dossier/${dossierId}`;
  if (found) {
    // WHY: relire après l'écriture donne l'état réel (un « Passer » ignoré reste une réponse).
    const keys = found.step.questions.map((question) => question.key);
    const answers = await listAnswers(dossierId, keys);
    target = answerRedirectTarget(dossierId, found.step, answers, found.index);
  }
  redirect(localizedPath(target, locale));
}

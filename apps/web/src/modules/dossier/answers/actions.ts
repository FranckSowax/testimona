'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { findQuestion } from '@/journey/registry';
import { SKIPPED } from '@/journey/types';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import type { DossierError } from '../service';
import { saveAnswer } from './service';

export interface AnswerState {
  error?: DossierError;
  fieldErrors?: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * Enregistre la réponse (ou « passée » si `intent=skip`) puis passe à la question suivante de
 * l'étape, ou revient au tableau de bord après la dernière.
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
  const nextIndex = (found?.index ?? 0) + 1;
  const target =
    found && nextIndex < found.step.questions.length
      ? `/dossier/${dossierId}/etape/${found.step.id}?q=${nextIndex}`
      : `/dossier/${dossierId}`;
  redirect(localizedPath(target, locale));
}

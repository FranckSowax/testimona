'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { LinesError } from './service';

export interface LinesFormState {
  ok?: boolean;
  error?: LinesError;
  fieldErrors?: Record<string, string>;
}

type Outcome = { ok: boolean; error?: LinesError; fieldErrors?: Record<string, string> };

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

const lineFields = (formData: FormData) => ({
  dossierId: field(formData, 'dossierId'),
  label: field(formData, 'label'),
  sober: field(formData, 'sober'),
  intermediate: field(formData, 'intermediate'),
  full: field(formData, 'full'),
});

/**
 * Vérifie la session, lance le traitement, puis revalide les pages qui affichent les postes.
 * WHY: un fichier 'use server' n'exporte que des fonctions asynchrones déclarées ; la logique
 * commune vit donc dans cette fonction privée.
 */
async function run(
  formData: FormData,
  handler: (locale: string) => Promise<Outcome>,
): Promise<LinesFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const locale = await getLocale();
  const res = await handler(locale);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  const dossierId = field(formData, 'dossierId');
  for (const path of [
    `/dossier/${dossierId}/cotisations/postes`,
    `/dossier/${dossierId}/cotisations/bilan`,
    `/dossier/${dossierId}/cotisations`,
    `/dossier/${dossierId}`,
  ]) {
    revalidatePath(localizedPath(path, locale));
  }
  return { ok: true };
}

/** Crée les postes de la grille. */
export async function createLinesAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, (locale) =>
    service.createGridLines({ dossierId: field(formData, 'dossierId') }, locale),
  );
}

/** Recalcule les postes non modifiés selon l'affluence. */
export async function recomputeLinesAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, () => service.recomputeLines({ dossierId: field(formData, 'dossierId') }));
}

/** Enregistre un poste modifié. */
export async function saveLineAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, () =>
    service.saveLine({ ...lineFields(formData), lineId: field(formData, 'lineId') }),
  );
}

/** Ajoute un poste libre. */
export async function addLineAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, () => service.addLine(lineFields(formData)));
}

/** Supprime un poste sans dépense. */
export async function deleteLineAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, () =>
    service.deleteLine({
      dossierId: field(formData, 'dossierId'),
      lineId: field(formData, 'lineId'),
    }),
  );
}

/** Retient un scénario ou l'efface. */
export async function chooseScenarioAction(
  _prev: LinesFormState | null,
  formData: FormData,
): Promise<LinesFormState> {
  return run(formData, () =>
    service.chooseScenario({
      dossierId: field(formData, 'dossierId'),
      scenario: field(formData, 'scenario'),
    }),
  );
}

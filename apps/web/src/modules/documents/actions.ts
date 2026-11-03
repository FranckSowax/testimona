'use server';

import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import { getCurrentUser } from '@/lib/supabase/server';
import type { Result } from '@/modules/dossier/service';
import type { DocumentTextKind } from './texts';
import { saveDocumentText } from './texts-service';

/**
 * Enregistre un texte du livret relu et modifié par la famille, puis rafraîchit la synthèse de
 * l'étape 3.5 (formats prêts à télécharger). L'entrée vient du navigateur : le service la valide
 * entièrement.
 */
export async function saveDocumentTextAction(input: {
  dossierId: string;
  kind: DocumentTextKind;
  text: string;
}): Promise<Result<{ key: string }>> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  // WHY: un appel d'action peut porter n'importe quelle valeur ; on ne transmet qu'un objet.
  const fields = typeof input === 'object' && input !== null ? input : {};
  const res = await saveDocumentText(fields);
  if (res.ok) {
    // WHY: le service a validé l'identifiant (UUID). Comme `setDossierPhotoAction`, on rafraîchit
    // la synthèse dans chaque langue : le segment [locale] existe toujours dans le chemin interne.
    const { dossierId } = fields as { dossierId: string };
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}/dossier/${dossierId}/etape/${DOCUMENTS_STEP_ID}/synthese`);
    }
  }
  return res;
}

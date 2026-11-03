'use server';

import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { PhotoResult, PreparedPhotoUpload } from './service';

// WHY: un appel d'action peut porter n'importe quelle valeur ; on n'étale qu'un objet.
const fieldsOf = (input: unknown) => (typeof input === 'object' && input !== null ? input : {});

/** Prépare l'envoi de la photo du défunt (coordinateur et plus). */
export async function preparePhotoAction(input: {
  dossierId: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<PhotoResult<PreparedPhotoUpload>> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  return service.preparePhotoUpload({ ...fieldsOf(input) });
}

/** Désigne la photo envoyée comme photo du dossier, puis rafraîchit la synthèse de l'étape 3.5. */
export async function setDossierPhotoAction(input: {
  dossierId: string;
  photoId: string;
}): Promise<PhotoResult<true>> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  const fields = { ...fieldsOf(input) };
  const res = await service.setDossierPhoto(fields);
  if (res.ok) {
    // WHY: le service a validé l'identifiant (UUID). Le segment [locale] existe toujours dans le
    // chemin interne, même quand l'URL publique n'a pas de préfixe (« as-needed ») : on
    // rafraîchit la synthèse dans chaque langue.
    const { dossierId } = fields as { dossierId: string };
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}/dossier/${dossierId}/etape/${DOCUMENTS_STEP_ID}/synthese`);
    }
  }
  return res;
}

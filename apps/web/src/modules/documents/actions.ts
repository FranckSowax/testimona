'use server';

import { getCurrentUser } from '@/lib/supabase/server';
import type { Result } from '@/modules/dossier/service';
import type { DocumentTextKind } from './texts';
import { saveDocumentText } from './texts-service';

/**
 * Enregistre un texte du livret relu et modifié par la famille.
 * L'entrée vient du navigateur : le service la valide entièrement.
 */
export async function saveDocumentTextAction(input: {
  dossierId: string;
  kind: DocumentTextKind;
  text: string;
}): Promise<Result<{ key: string }>> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  // WHY: un appel d'action peut porter n'importe quelle valeur ; on ne transmet qu'un objet.
  const fields = typeof input === 'object' && input !== null ? input : {};
  return saveDocumentText(fields);
}

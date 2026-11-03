import 'server-only';
import { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import * as answersRepo from '@/modules/dossier/answers/repo';
import { getDossier } from '@/modules/dossier/repo';
import { fieldErrors, fromRepo, type Result } from '@/modules/dossier/service';
import { DOCUMENT_TEXT_KINDS, DOCUMENT_TEXTS, documentTextSchema } from './texts';

const SaveDocumentTextInputSchema = z.object({
  dossierId: z.string().uuid(),
  kind: z.enum(DOCUMENT_TEXT_KINDS),
  text: z.string(),
});

/**
 * Enregistre un texte du livret (couverture, hommage ou remerciements) relu par la famille.
 * Refuse un texte vide ou trop long pour son gabarit, et un dossier où l'étape 3.5 est fermée.
 * Le rôle (contributor ou plus) est vérifié par la RLS de `journey_answer`.
 *
 * @example
 * await saveDocumentText({ dossierId, kind: 'tribute', text });
 */
export async function saveDocumentText(raw: unknown): Promise<Result<{ key: string }>> {
  const input = SaveDocumentTextInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, kind } = input.data;

  const text = documentTextSchema(kind).safeParse(input.data.text);
  if (!text.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(text.error.issues) };
  }

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, DOCUMENTS_STEP_ID)) return { ok: false, error: 'validation' };

  const key = DOCUMENT_TEXTS[kind];
  const res = await answersRepo.upsertAnswer({ dossierId, key, value: text.data });
  if (res.error) return fromRepo(res.error, 'saveDocumentText');
  return { ok: true, data: { key } };
}

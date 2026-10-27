import 'server-only';
import { z } from 'zod';
import { findQuestion, getStep, isStepOpen } from '@/journey/registry';
import { answerSchema, draftTextSchema, isSkipped, SKIPPED } from '@/journey/types';
import { getDossier } from '../repo';
import { fieldErrors, fromRepo, type Result } from '../service';
import * as repo from './repo';

const SaveAnswerInputSchema = z.object({
  dossierId: z.string().uuid(),
  key: z.string().max(100),
  value: z.unknown(),
});

/**
 * Enregistre une réponse du parcours, ou « passée ».
 * Refuse une clé absente du registre, une étape fermée pour la porte du dossier et une valeur qui
 * ne passe pas le schéma de sa question (taille bornée comprise). Le rôle (contributor ou plus)
 * est vérifié par la RLS. Une erreur sans chemin de champ (question simple, ou taille trop grande)
 * est rangée sous la clé `''` de `fieldErrors`. « Passer » une question déjà répondue ne change
 * rien et réussit.
 *
 * @example
 * await saveAnswer({ dossierId, key: 'biography.motto', value: 'Toujours debout' });
 */
export async function saveAnswer(raw: unknown): Promise<Result<{ key: string }>> {
  const input = SaveAnswerInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, key } = input.data;
  const found = findQuestion(key);
  if (!found) return { ok: false, error: 'validation' };

  let value: unknown = SKIPPED;
  if (!isSkipped(input.data.value)) {
    const parsed = answerSchema(found.question).safeParse(input.data.value);
    if (!parsed.success) {
      return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
    }
    value = parsed.data;
  }

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, found.step.id)) return { ok: false, error: 'validation' };

  // WHY: « Passer » sert à remettre une question à plus tard ; il ne doit jamais effacer une
  // réponse déjà donnée (double clic, onglet périmé, retour arrière).
  if (isSkipped(value)) {
    const existing = await repo.listAnswers(dossierId, [key]);
    const current = existing[key];
    if (current !== undefined && current !== null && !isSkipped(current)) {
      return { ok: true, data: { key } };
    }
  }

  const res = await repo.upsertAnswer({ dossierId, key, value });
  if (res.error) return fromRepo(res.error, 'saveAnswer');
  return { ok: true, data: { key } };
}

const SaveDraftInputSchema = z.object({
  dossierId: z.string().uuid(),
  stepId: z.string().max(50),
  text: z.string(),
});

/**
 * Enregistre le brouillon d'une étape (message immédiat, annonce par e-mail) sous sa clé.
 * Refuse une étape sans brouillon, fermée pour la porte du dossier, ou un texte vide ou trop long.
 *
 * @example
 * await saveDraft({ dossierId, stepId: 'immediate-message', text });
 */
export async function saveDraft(raw: unknown): Promise<Result<{ key: string }>> {
  const input = SaveDraftInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, stepId } = input.data;
  const step = getStep(stepId);
  const draft = step?.draft;
  if (!step || !draft) return { ok: false, error: 'validation' };

  const text = draftTextSchema.safeParse(input.data.text);
  if (!text.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(text.error.issues) };
  }

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, step.id)) return { ok: false, error: 'validation' };

  const res = await repo.upsertAnswer({ dossierId, key: draft.key, value: text.data });
  if (res.error) return fromRepo(res.error, 'saveDraft');
  return { ok: true, data: { key: draft.key } };
}

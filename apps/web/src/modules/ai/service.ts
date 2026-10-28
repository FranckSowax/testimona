import 'server-only';
import { z } from 'zod';
import { getStep, isStepOpen } from '@/journey/registry';
import { draftTextSchema } from '@/journey/types';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getPersonResult } from '@/modules/dossier/repo';
import { isAiEnabled } from './config';
import { AI_ANSWER_KEYS, aiFacts } from './facts';
import { buildImprovePrompt } from './prompt';
import { AiProviderError, openRouterProvider, type ImproveProvider } from './provider';
import { takeAiQuota } from './quota';
import type { AiResult } from './types';

const InputSchema = z.object({
  dossierId: z.string().uuid(),
  stepId: z.string().max(50),
  locale: z.enum(['fr', 'en']),
  text: z.string(),
});

/**
 * Améliore le brouillon d'une étape avec l'IA, sans l'enregistrer.
 * Refuse une étape sans brouillon ou fermée et un texte invalide ; consomme le quota du jour
 * (contributeur et plus) avant l'appel ; n'envoie que la personne et les réponses de la liste
 * blanche. Un échec de l'IA donne `failed` : le texte affiché n'est jamais perdu.
 *
 * @example
 * const res = await improveDraft({ dossierId, stepId: 'immediate-message', locale: 'fr', text });
 */
export async function improveDraft(raw: unknown, provider?: ImproveProvider): Promise<AiResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  // WHY: `apiKey` sert au typage (string) ; `isAiEnabled` reste la source de vérité du drapeau.
  if (!isAiEnabled() || !apiKey) return { ok: false, error: 'unavailable' };

  const input = InputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, stepId, locale } = input.data;
  const draft = getStep(stepId)?.draft;
  if (!draft) return { ok: false, error: 'validation' };
  const text = draftTextSchema.safeParse(input.data.text);
  if (!text.success) return { ok: false, error: 'validation' };

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, stepId)) return { ok: false, error: 'validation' };

  // WHY: lire avant de consommer le quota : une lecture (fiche ou réponses) en échec ne coûte pas
  // d'appel, et l'IA ne doit jamais travailler sur des faits vides à l'insu de la famille.
  const [person, answers] = await Promise.all([
    getPersonResult(dossierId),
    listAnswersResult(dossierId, AI_ANSWER_KEYS),
  ]);
  if (person.error || answers.error) return { ok: false, error: 'failed' };

  const quotaError = await takeAiQuota(dossierId);
  if (quotaError) return { ok: false, error: quotaError };

  // WHY: sans fiche (lecture réussie mais aucune ligne), le titre du dossier tient lieu de nom,
  // comme sur la page brouillon.
  const facts = aiFacts(
    draft.kind,
    person.data ?? { firstName: '', lastName: dossier.title, nickname: null, deathDate: null },
    answers.data,
  );
  const prompt = buildImprovePrompt({ kind: draft.kind, locale, text: text.data, facts });

  try {
    const improved = await (provider ?? openRouterProvider(apiKey))(prompt);
    const checked = draftTextSchema.safeParse(improved);
    if (!checked.success) {
      console.error('[ai] improved text rejected', {
        stepId,
        issue: checked.error.issues[0]?.message,
      });
      return { ok: false, error: 'failed' };
    }
    return { ok: true, text: checked.data };
  } catch (error) {
    const reason = error instanceof AiProviderError ? error.reason : 'unknown';
    console.error('[ai] improveDraft failed', { stepId, reason });
    return { ok: false, error: 'failed' };
  }
}

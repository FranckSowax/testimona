import 'server-only';
import { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { DOCUMENTS_STEP_ID } from '@/journey/steps/3-5-funeral-documents';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getPersonResult } from '@/modules/dossier/repo';
import { DOCUMENT_TEXT_KINDS, documentTextSchema } from '@/modules/documents/texts';
import { isAiEnabled } from './config';
import { DOCUMENT_AI_KEYS, documentFacts } from './documents-facts';
import { buildDocumentTextsPrompt } from './documents-prompt';
import type { ImprovePrompt } from './prompt';
import { AiProviderError, completeChat, type ProviderDeps } from './provider';
import { takeAiQuota } from './quota';
import type { DocumentTexts, DocumentTextsResult } from './types';

/** Rédige les trois textes du livret et renvoie le texte brut ; lève `AiProviderError`. */
export type DocumentTextsProvider = (prompt: ImprovePrompt) => Promise<string>;

const InputSchema = z.object({
  dossierId: z.string().uuid(),
  locale: z.enum(['fr', 'en']),
});

// WHY: trois textes courts (environ 2 300 caractères au plus) en JSON ; la marge couvre le
// raisonnement (effort bas, exclu de la réponse) sans laisser une réponse partir à la dérive.
const MAX_TOKENS = 6_000;

const TextsSchema = z
  .object({
    cover: documentTextSchema('cover'),
    tribute: documentTextSchema('tribute'),
    thanks: documentTextSchema('thanks'),
  })
  .strict();

// WHY: une heure (« 9:30 », « 14h05 », « 10 h 30 ») vient du programme de la cérémonie, jamais
// de l'IA : un texte qui en contient une est refusé plutôt que corrigé.
const TIME = /\b([01]?\d|2[0-3])\s?[:hH]\s?[0-5]\d\b/;

// WHY: certains modèles enveloppent malgré la consigne leur JSON dans un bloc ```json ; on tolère
// ce seul habillage, rien d'autre (pas de texte avant ou après).
const FENCE = /^```(?:json)?[ \t]*\n([\s\S]*?)\n?```$/;

/** Textes validés, ou null quand la réponse n'est pas le JSON attendu. */
function parseTexts(raw: string): DocumentTexts | null {
  const trimmed = raw.trim();
  const body = FENCE.exec(trimmed)?.[1] ?? trimmed;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  const parsed = TextsSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Fournisseur OpenRouter des textes du livret (serveur seulement), à effort bas et réponse bornée.
 *
 * @example
 * const raw = await openRouterDocumentsProvider(apiKey)(buildDocumentTextsPrompt(args));
 */
export function openRouterDocumentsProvider(
  apiKey: string,
  deps: ProviderDeps = {},
): DocumentTextsProvider {
  return ({ system, user }) =>
    completeChat(
      apiKey,
      {
        max_tokens: MAX_TOKENS,
        reasoning: { effort: 'low', exclude: true },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      deps,
    );
}

/**
 * Propose les trois textes du livret (couverture, hommage, remerciements) en un seul appel à
 * l'IA, sans rien enregistrer : la famille relit, modifie puis enregistre chaque texte avec
 * `saveDocumentTextAction`.
 * Refuse un dossier où l'étape 3.5 est fermée ; lit la fiche et les réponses avant de consommer
 * un appel du quota du jour ; n'envoie que les faits de `documentFacts`. Une réponse mal formée,
 * trop longue ou contenant une heure donne `failed`.
 *
 * @example
 * const res = await generateDocumentTexts({ dossierId, locale: 'fr' });
 * if (res.ok) setTexts(res.texts);
 */
export async function generateDocumentTexts(
  raw: unknown,
  provider?: DocumentTextsProvider,
): Promise<DocumentTextsResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  // WHY: `apiKey` sert au typage (string) ; `isAiEnabled` reste la source de vérité du drapeau.
  if (!isAiEnabled() || !apiKey) return { ok: false, error: 'unavailable' };

  const input = InputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, locale } = input.data;

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, DOCUMENTS_STEP_ID)) return { ok: false, error: 'validation' };

  // WHY: lire avant de consommer le quota : une lecture en échec ne coûte pas d'appel, et l'IA ne
  // doit jamais rédiger sur des faits vides à l'insu de la famille.
  const [person, answers] = await Promise.all([
    getPersonResult(dossierId),
    listAnswersResult(dossierId, DOCUMENT_AI_KEYS),
  ]);
  if (person.error || answers.error) return { ok: false, error: 'failed' };

  // WHY: un seul appel compté pour les trois textes.
  const quotaError = await takeAiQuota(dossierId);
  if (quotaError) return { ok: false, error: quotaError };

  // WHY: sans fiche, pas de repli sur le titre du dossier (comme pour les annonces) : il porte
  // le nom de famille, qui ne doit pas partir.
  const facts = documentFacts(person.data ?? { firstName: '', nickname: null }, answers.data);
  const prompt = buildDocumentTextsPrompt({ locale, facts });

  let response: string;
  try {
    response = await (provider ?? openRouterDocumentsProvider(apiKey))(prompt);
  } catch (error) {
    const reason = error instanceof AiProviderError ? error.reason : 'unknown';
    console.error('[ai] generateDocumentTexts failed', { reason });
    return { ok: false, error: 'failed' };
  }

  const texts = parseTexts(response);
  if (!texts) {
    // WHY: on journalise la nature du refus, jamais la réponse (elle reprend la biographie).
    console.error('[ai] document texts rejected', { issue: 'shape' });
    return { ok: false, error: 'failed' };
  }
  const withTime = DOCUMENT_TEXT_KINDS.find((kind) => TIME.test(texts[kind]));
  if (withTime) {
    console.error('[ai] document texts rejected', { issue: 'time', kind: withTime });
    return { ok: false, error: 'failed' };
  }
  return { ok: true, texts };
}

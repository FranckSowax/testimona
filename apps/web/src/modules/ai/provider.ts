import 'server-only';
import { z } from 'zod';
import { AI_MODEL } from './config';
import type { ImprovePrompt } from './prompt';

export type AiProviderFailure = 'refusal' | 'truncated' | 'empty' | 'api';

/** Échec du fournisseur ; `reason` est journalisable, jamais le texte. */
export class AiProviderError extends Error {
  constructor(readonly reason: AiProviderFailure) {
    super(`ai provider: ${reason}`);
    this.name = 'AiProviderError';
  }
}

/** Réécrit un brouillon à partir du prompt ; lève `AiProviderError` en cas d'échec. */
export type ImproveProvider = (prompt: ImprovePrompt) => Promise<string>;

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// WHY: une réécriture courte à effort bas répond en quelques secondes ; 45 s par essai et un
// seul nouvel essai gardent l'écran réactif sans abandonner au premier incident passager.
const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;
const MAX_TOKENS = 16_000;
// WHY: délai, limite de débit, modèle ou fournisseur momentanément indisponible.
const RETRYABLE = new Set([408, 429, 502, 503]);

const ResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ content: z.string().nullish() }).nullish(),
        error: z.object({}).passthrough().nullish(),
      }),
    )
    .min(1),
});

async function send(fetchImpl: typeof fetch, apiKey: string, body: string): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Testimona',
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok || !RETRYABLE.has(res.status) || attempt >= MAX_ATTEMPTS) return res;
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw error;
    }
  }
}

/**
 * Fournisseur OpenRouter (serveur seulement), modèle Claude Opus 5.5.
 * WHY: `data_collection: 'deny'` écarte les fournisseurs qui entraînent leurs modèles sur les
 * requêtes : les textes des familles ne doivent servir qu'à leur réponse.
 *
 * @example
 * const text = await openRouterProvider(apiKey)(buildImprovePrompt(args));
 */
export function openRouterProvider(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): ImproveProvider {
  return async ({ system, user }) => {
    const body = JSON.stringify({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      reasoning: { effort: 'low', exclude: true },
      provider: { data_collection: 'deny' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    let res: Response;
    try {
      res = await send(fetchImpl, apiKey, body);
    } catch (error) {
      // WHY: on journalise la nature de l'échec, jamais le prompt ni la réponse.
      console.error('[ai] provider error', {
        name: error instanceof Error ? error.name : 'unknown',
      });
      throw new AiProviderError('api');
    }
    if (!res.ok) {
      console.error('[ai] provider error', { status: res.status });
      throw new AiProviderError('api');
    }

    const parsed = ResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      console.error('[ai] provider error', { status: res.status, shape: 'unexpected' });
      throw new AiProviderError('api');
    }
    const choice = parsed.data.choices[0]!;
    if (choice.error) throw new AiProviderError('api');
    if (choice.finish_reason === 'content_filter') throw new AiProviderError('refusal');
    if (choice.finish_reason === 'length') throw new AiProviderError('truncated');
    const text = choice.message?.content?.trim() ?? '';
    if (!text) throw new AiProviderError('empty');
    return text;
  };
}

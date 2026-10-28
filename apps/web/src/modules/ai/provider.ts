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
// WHY: une réécriture courte à effort bas répond en quelques secondes ; 45 s par essai, un seul
// nouvel essai et un budget global de 60 s gardent l'écran réactif sans abandonner au premier
// incident passager.
const TIMEOUT_MS = 45_000;
const DEADLINE_MS = 60_000;
const MAX_ATTEMPTS = 2;
const MAX_TOKENS = 16_000;
// WHY: limite de débit, délai, modèle ou fournisseur momentanément indisponible.
const RETRYABLE = new Set([408, 429, 502, 503]);
// WHY: au-delà, on respecte le fournisseur en ne réessayant pas plutôt que de bloquer l'écran.
const MAX_RETRY_AFTER_MS = 2_000;

/** Dépendances injectables (tests rapides et déterministes). */
export interface ProviderDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const ResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        // NOTE: un `content` en tableau de parties n'est pas géré : il est classé `api`.
        message: z.object({ content: z.string().nullish() }).nullish(),
        error: z.object({}).passthrough().nullish(),
      }),
    )
    .min(1),
});

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/** Pause avant le second essai ; `null` quand le fournisseur demande d'attendre trop longtemps. */
function retryDelay(res: Response | null, now: () => number): number | null {
  const raw = res?.headers.get('Retry-After');
  if (raw) {
    const seconds = Number(raw);
    // WHY: `Retry-After` est soit un nombre de secondes, soit une date HTTP.
    const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(raw) - now();
    if (Number.isFinite(ms) && (ms >= 0 || !Number.isFinite(seconds))) {
      return ms <= MAX_RETRY_AFTER_MS ? Math.max(0, ms) : null;
    }
  }
  return 500 + Math.random() * 500;
}

async function send(deps: Required<ProviderDeps>, apiKey: string, body: string): Promise<Response> {
  const start = deps.now();
  const remaining = () => DEADLINE_MS - (deps.now() - start);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res: Response | null = null;
    try {
      res = await deps.fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Testimona',
        },
        body,
        signal: AbortSignal.timeout(Math.max(1, Math.min(TIMEOUT_MS, remaining()))),
      });
      if (res.ok || !RETRYABLE.has(res.status)) return res;
    } catch (error) {
      // WHY: seule une erreur réseau est réessayée ; un délai dépassé a déjà consommé le budget.
      if (isTimeout(error) || !(error instanceof TypeError)) throw error;
      if (attempt >= MAX_ATTEMPTS) throw error;
    }
    const delay = retryDelay(res, deps.now);
    if (attempt >= MAX_ATTEMPTS || delay === null || delay >= remaining()) {
      if (res) return res;
      throw new TypeError('network error');
    }
    await res?.body?.cancel().catch(() => {});
    await deps.sleep(delay);
  }
  throw new Error('ai provider: attempts exhausted');
}

/**
 * Envoie une requête de complétion à OpenRouter et renvoie le texte de la réponse, nettoyé.
 * Lève `AiProviderError` en cas d'échec ; ne journalise jamais la requête ni la réponse.
 *
 * @example
 * const text = await completeChat(apiKey, { model: AI_MODEL, messages });
 */
export async function completeChat(
  apiKey: string,
  payload: Record<string, unknown>,
  deps: ProviderDeps = {},
): Promise<string> {
  const resolved: Required<ProviderDeps> = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    now: deps.now ?? Date.now,
  };
  let res: Response;
  try {
    res = await send(resolved, apiKey, JSON.stringify(payload));
  } catch (error) {
    // WHY: on journalise la nature de l'échec, jamais le prompt ni la réponse.
    console.error('[ai] provider error', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    throw new AiProviderError('api');
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    console.error('[ai] provider error', { status: res.status });
    throw new AiProviderError('api');
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (error) {
    console.error('[ai] provider error', {
      read: error instanceof Error ? error.name : 'unknown',
    });
    throw new AiProviderError('api');
  }
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[ai] provider error', { shape: 'unexpected' });
    throw new AiProviderError('api');
  }
  const choice = parsed.data.choices[0]!;
  if (choice.error) {
    console.error('[ai] provider error', { choiceError: true });
    throw new AiProviderError('api');
  }
  if (choice.finish_reason === 'error') {
    console.error('[ai] provider error', { finish: 'error' });
    throw new AiProviderError('api');
  }
  if (choice.finish_reason === 'content_filter') throw new AiProviderError('refusal');
  if (choice.finish_reason === 'length') throw new AiProviderError('truncated');
  const text = choice.message?.content?.trim() ?? '';
  if (!text) throw new AiProviderError('empty');
  return text;
}

/**
 * Fournisseur OpenRouter (serveur seulement), modèle Claude Opus 5.5.
 * WHY: `data_collection: 'deny'` écarte les fournisseurs qui entraînent leurs modèles sur les
 * requêtes : les textes des familles ne doivent servir qu'à leur réponse.
 *
 * @example
 * const text = await openRouterProvider(apiKey)(buildImprovePrompt(args));
 */
export function openRouterProvider(apiKey: string, deps: ProviderDeps = {}): ImproveProvider {
  return ({ system, user }) =>
    completeChat(
      apiKey,
      {
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        reasoning: { effort: 'low', exclude: true },
        provider: { data_collection: 'deny' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      deps,
    );
}

import 'server-only';

/** Modèle utilisé pour améliorer les brouillons (identifiant OpenRouter de Claude Opus 5.5). */
export const AI_MODEL = 'anthropic/claude-opus-5.5';

/** Appels à l'IA par dossier et par jour (la base borne aussi cette valeur). */
export const AI_DAILY_LIMIT = 20;

/**
 * Vrai quand la clé OpenRouter est configurée ; sinon le bouton « Améliorer avec l'IA » est masqué.
 *
 * @example
 * <DraftEditor aiEnabled={isAiEnabled()} … />
 */
export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

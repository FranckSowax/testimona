import type { QuoteError } from '../quote-service';

/**
 * Texte d'une erreur de demande de devis : `providers.quote.errors` pour `unreachable`,
 * `dossier.errors` pour les autres.
 *
 * @example
 * quoteErrorText('unreachable', t); // « Ce prestataire ne peut plus être contacté… »
 */
export function quoteErrorText(error: QuoteError, t: (key: string) => string): string {
  return t(
    error === 'unreachable' ? 'providers.quote.errors.unreachable' : `dossier.errors.${error}`,
  );
}

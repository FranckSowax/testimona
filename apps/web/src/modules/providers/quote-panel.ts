import type { Quantity } from '@/journey/quantities';
import type { PanelGroup } from './panel';
import { quoteMessage } from './quote-message';

type Translate = (key: string, values?: Record<string, string | number>) => string;

const isPlace = (value: unknown): value is { city: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { city?: unknown }).city === 'string';

/**
 * Ville du message de devis : celle du lieu de la veillée (réponse `vigil.place`), sinon celle de
 * l'encadré (ville du décès, sinon Libreville).
 *
 * @example
 * quotePlace({ city: 'Franceville', countryCode: 'GA' }, 'Libreville'); // 'Franceville'
 */
export function quotePlace(placeAnswer: unknown, panelCity: string): string {
  const city = isPlace(placeAnswer) ? placeAnswer.city.trim() : '';
  return city || panelCity;
}

/**
 * Messages de devis par prestataire contactable de l'encadré (vérifié, non exemple), indexés
 * par identifiant. Le numéro n'entre jamais dans le message.
 *
 * @example
 * quoteMessages(groups, { place: 'Libreville', date: null, quantities }, t);
 */
export function quoteMessages(
  groups: readonly PanelGroup[],
  context: { place: string; date: string | null; quantities: readonly Quantity[] },
  t: Translate,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const group of groups) {
    for (const provider of group.providers) {
      // WHY: mêmes conditions que `request_quote` (TL010) : un bouton proposé à tort mènerait à
      // une demande refusée. Le numéro n'est pas lu ici ; un prestataire vérifié en a toujours un
      // (contrainte `provider_verified_has_number`).
      if (provider.isExample || !provider.verifiedAt) continue;
      messages[provider.id] = quoteMessage(
        { providerName: provider.name, category: group.category, ...context },
        t,
      );
    }
  }
  return messages;
}

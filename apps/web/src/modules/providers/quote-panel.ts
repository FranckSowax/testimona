import { ceremonyDate } from '@/journey/ceremony';
import type { Answers } from '@/journey/progress';
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

/** Ce que disent les messages de devis, en plus du prestataire et de sa catégorie. */
export interface QuoteContext {
  place: string;
  /** Date des obsèques en toutes lettres ; null : « à préciser ». */
  date: string | null;
  quantities: readonly Quantity[];
}

/**
 * Contexte des messages de devis d'une synthèse (3.1, 3.2, 3.4) : ville de la veillée (sinon
 * celle de l'encadré) et date des obsèques (3.4) dans la langue de l'interface.
 * WHY: seules ces réponses sortent du dossier ; le nom du défunt n'en fait jamais partie.
 *
 * @example
 * quoteContext({ answers, city: 'Libreville', locale: 'fr', quantities: [] });
 * // { place: 'Libreville', date: 'samedi 14 novembre 2026', quantities: [] }
 */
export function quoteContext(input: {
  answers: Answers;
  city: string;
  locale: string;
  quantities: readonly Quantity[];
}): QuoteContext {
  return {
    place: quotePlace(input.answers['vigil.place'], input.city),
    date: ceremonyDate(input.answers['ceremony.date'], input.locale),
    quantities: input.quantities,
  };
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
  context: QuoteContext,
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

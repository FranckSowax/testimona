import type { Quantity, QuantityKey } from '@/journey/quantities';
import type { ProviderCategory } from './categories';

/** Longueur maximale d'un message, comme la contrainte de `quote_request.message`. */
export const QUOTE_MESSAGE_MAX = 2000;

// WHY: chaque prestataire ne reçoit que les besoins qui le concernent ; une catégorie absente
// (pompes funèbres, imprimeur) n'en reçoit aucun.
const CATEGORY_QUANTITIES: Partial<Record<ProviderCategory, readonly QuantityKey[]>> = {
  tentsChairs: ['tents', 'chairs', 'benchPlaces'],
  sound: ['soundSystems'],
  lighting: ['lightSets'],
  catering: ['platesPerNight', 'funeralPlates'],
  drinks: ['waterPacks', 'drinkBottles', 'iceKg'],
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface QuoteMessageInput {
  providerName: string;
  category: ProviderCategory;
  /** Ville du lieu de la veillée, sinon du décès. */
  place: string;
  /** Date déjà formatée, ou null (« à préciser »). */
  date: string | null;
  quantities: readonly Quantity[];
}

/** Quantités d'une estimation utiles à une catégorie, dans l'ordre de l'estimation. */
export function quantitiesFor(
  category: ProviderCategory,
  quantities: readonly Quantity[],
): Quantity[] {
  const keys = CATEGORY_QUANTITIES[category] ?? [];
  return quantities.filter((quantity) => keys.includes(quantity.key));
}

/**
 * Message de demande de devis, construit sans IA. Ne contient jamais le nom de la personne
 * décédée : seuls le besoin, la date, le lieu et les quantités sortent du dossier.
 * `t` est un traducteur sans espace de noms.
 *
 * @example
 * quoteMessage({ providerName: 'Tentes Owendo', category: 'tentsChairs', place: 'Libreville',
 *   date: null, quantities }, t);
 */
export function quoteMessage(input: QuoteMessageInput, t: Translate): string {
  const lines = [
    t('providers.quote.message.greeting', { name: input.providerName }),
    t('providers.quote.message.need', { category: t(`providers.category.${input.category}`) }),
    t('providers.quote.message.date', {
      date: input.date ?? t('providers.quote.message.dateUnknown'),
    }),
    t('providers.quote.message.place', { place: input.place }),
  ];
  const needs = quantitiesFor(input.category, input.quantities);
  if (needs.length > 0) {
    lines.push(t('providers.quote.message.quantities'));
    for (const need of needs) {
      lines.push(`- ${t(`journey.synthesis.quantity.${need.key}`, { count: need.count })}`);
    }
  }
  lines.push(t('providers.quote.message.closing'));
  return lines.join('\n').slice(0, QUOTE_MESSAGE_MAX);
}

/**
 * Lien d'ouverture de WhatsApp vers le prestataire, message prérempli.
 *
 * @example
 * quoteHref('+24177123456', 'Bonjour'); // 'https://wa.me/24177123456?text=Bonjour'
 */
export function quoteHref(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}

/**
 * Montant entier en francs CFA (XAF), au format de la langue de l'interface.
 *
 * @example
 * formatXaf(2_409_000, 'fr'); // « 2 409 000 FCFA »
 */
export function formatXaf(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

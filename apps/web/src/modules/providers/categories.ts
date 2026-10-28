/**
 * Catégories de prestataires, dans l'ordre d'affichage ; mêmes clés et même ordre que
 * `provider_category` en base. Libellés : `providers.category.<clé>`.
 *
 * @example
 * PROVIDER_CATEGORIES.map((key) => t(`providers.category.${key}`));
 */
export const PROVIDER_CATEGORIES = [
  'funeralHome',
  'tentsChairs',
  'sound',
  'lighting',
  'catering',
  'drinks',
  'printing',
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

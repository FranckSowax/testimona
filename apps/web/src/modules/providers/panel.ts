import type { ProviderCategory } from './categories';
import type { Provider } from './schema';

/** Prestataires affichés au plus par catégorie. */
export const PANEL_PER_CATEGORY = 5;
/** Ville par défaut quand la fiche n'a pas de ville du décès. */
export const DEFAULT_CITY = 'Libreville';

export interface PanelGroup {
  category: ProviderCategory;
  providers: readonly Provider[];
}

const isVerified = (p: Provider) => !p.isExample && p.verifiedAt !== null;

// WHY: la ville est saisie librement (« libreville », « Lambarene ») ; on compare sans casse ni
// accents plutôt qu'avec un motif `ilike`, dont les jokers PostgREST ne s'échappent pas.
const sameCity = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'fr', { sensitivity: 'base' }) === 0;

/**
 * Ville de recherche de l'encadré : ville du décès, sinon Libreville.
 *
 * @example
 * panelCity(null); // 'Libreville'
 */
export function panelCity(deathCity: string | null): string {
  const city = deathCity?.trim();
  return city ? city : DEFAULT_CITY;
}

/**
 * Prestataires de l'encadré, par catégorie dans l'ordre demandé : actifs, vérifiés ou d'exemple,
 * de la ville ; vérifiés d'abord, puis par nom ; cinq au plus ; catégories vides omises.
 *
 * @example
 * panelGroups(providers, ['tentsChairs', 'sound'], 'Libreville');
 */
export function panelGroups(
  providers: readonly Provider[],
  categories: readonly ProviderCategory[],
  city: string,
  perCategory = PANEL_PER_CATEGORY,
): PanelGroup[] {
  return categories.flatMap((category) => {
    const list = providers
      .filter(
        (p) =>
          p.categoryKey === category &&
          p.active &&
          (p.isExample || isVerified(p)) &&
          sameCity(p.city, city),
      )
      .sort(
        (a, b) =>
          Number(isVerified(b)) - Number(isVerified(a)) || a.name.localeCompare(b.name, 'fr'),
      )
      .slice(0, perCategory);
    return list.length > 0 ? [{ category, providers: list }] : [];
  });
}

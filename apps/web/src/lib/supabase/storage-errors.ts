/**
 * Erreurs du stockage Supabase, partagées par les dépôts qui lisent ou écrivent des fichiers
 * (reçus, photo du dossier).
 */

/**
 * Résultat d'échec d'un appel au stockage.
 * WHY: les erreurs du stockage n'ont pas de code Postgres ; « storage » les distingue.
 *
 * @example
 * if (error) return storageFail(error);
 */
export const storageFail = (error: { message?: string }) => ({
  data: null,
  error: { code: 'storage', message: error.message || 'storage error' },
});

/**
 * Vrai quand le stockage signale un objet absent (fichier préparé jamais envoyé).
 * WHY: l'API répond 400 avec `statusCode` « 404 » (ou un code « not found »).
 *
 * @example
 * if (error && isMissingObject(error)) return objectMissing;
 */
export function isMissingObject(error: { status?: number; statusCode?: string }): boolean {
  return (
    error.status === 404 ||
    error.statusCode === '404' ||
    error.statusCode === 'not_found' ||
    error.statusCode === 'NoSuchKey'
  );
}

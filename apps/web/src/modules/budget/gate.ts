import 'server-only';
import { isStepOpen } from '@/journey/registry';
import { getDossier } from '@/modules/dossier/repo';

/**
 * Le registre et les postes n'existent que pour un dossier lisible ouvert au budget (porte
 * « décès »). Renvoie 'not_found' sinon.
 * WHY: un dossier sans étape budget n'a pas de budget : on le traite comme absent.
 *
 * @example
 * if (await budgetGate(dossierId)) return { ok: false, error: 'not_found' };
 */
export async function budgetGate(dossierId: string): Promise<'not_found' | null> {
  const dossier = await getDossier(dossierId);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) return 'not_found';
  return null;
}

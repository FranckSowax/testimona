import { z } from 'zod';
import type { EntryKind, EntryMethod } from '../ledger/schema';

/** Référence d'un dossier pour la clôture, la réouverture et l'export. */
export const ClosingRefSchema = z.object({ dossierId: z.string().uuid() });

/**
 * Langue des en-têtes de l'export ; le français par défaut.
 * WHY: la route d'export est hors des routes localisées ; la page passe sa langue en paramètre.
 */
export const ExportLangSchema = z.enum(['fr', 'en']).catch('fr');
export type ExportLang = z.infer<typeof ExportLangSchema>;

/** État de clôture des cotisations : date ISO de la clôture, ou null si elles sont ouvertes. */
export interface Closure {
  closedAt: string | null;
}

/** Ligne du registre telle qu'exportée (toutes les colonnes utiles, annulations comprises). */
export interface ExportRow {
  id: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  partyName: string;
  budgetLineId: string | null;
  note: string;
  occurredOn: string;
  reversesId: string | null;
  /** Promesse à laquelle se rattache ce versement, ou null. */
  pledgeId: string | null;
  createdAt: string;
}

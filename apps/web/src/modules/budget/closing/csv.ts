import type { EntryKind, EntryMethod } from '../ledger/schema';
import type { ExportRow } from './schema';

/** Colonnes de l'export du registre, dans l'ordre du fichier. */
export const CSV_COLUMNS = [
  'date',
  'kind',
  'amount',
  'method',
  'party',
  'line',
  'note',
  'reverses',
  'pledge',
  'id',
  'createdAt',
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Libellés traduits de l'en-tête, des types de ligne et des moyens de paiement. */
export interface CsvLabels {
  columns: Record<CsvColumn, string>;
  kind: Record<EntryKind, string>;
  method: Record<EntryMethod, string>;
}

// WHY: « ; » est le séparateur attendu par les tableurs réglés en français ; le BOM fait lire
// l'UTF-8 (accents) à Excel.
const SEPARATOR = ';';
const BOM = '﻿';

// WHY: une cellule qui commence par =, +, -, @, tabulation ou retour chariot serait exécutée
// comme une formule par un tableur (injection CSV) ; on la préfixe d'une apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Registre complet au format CSV : une ligne par mouvement, annulations comprises, montants
 * entiers en XAF.
 *
 * @example
 * ledgerCsv(rows, new Map([[lineId, 'Cercueil']]), labels); // '﻿"Date";"Type";…\r\n…'
 */
export function ledgerCsv(
  rows: readonly ExportRow[],
  lineLabels: ReadonlyMap<string, string>,
  labels: CsvLabels,
): string {
  const header = CSV_COLUMNS.map((column) => cell(labels.columns[column])).join(SEPARATOR);
  const body = rows.map((r) =>
    [
      r.occurredOn,
      labels.kind[r.kind],
      String(r.amount),
      r.method ? labels.method[r.method] : '',
      r.partyName,
      r.budgetLineId ? (lineLabels.get(r.budgetLineId) ?? '') : '',
      r.note,
      r.reversesId ?? '',
      r.pledgeId ?? '',
      r.id,
      r.createdAt,
    ]
      .map(cell)
      .join(SEPARATOR),
  );
  return `${BOM}${[header, ...body].join('\r\n')}\r\n`;
}

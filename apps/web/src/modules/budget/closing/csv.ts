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
  'reversesKind',
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

// WHY: « ; » est le séparateur attendu par les tableurs réglés en français (la virgule y est la
// décimale), « , » celui des tableurs réglés en anglais ; le BOM fait lire l'UTF-8 (accents) à
// Excel.
export type CsvSeparator = ';' | ',';
const BOM = '﻿';

// WHY: une cellule qui commence par =, +, -, @ (y compris en pleine chasse, et après des espaces
// que certains tableurs ignorent), par une tabulation ou un retour chariot serait exécutée comme
// une formule par un tableur (injection CSV) ; on la préfixe d'une apostrophe.
const FORMULA_START = /^\s*[=+\-@＝＋－＠]|^[\t\r]/u;

// WHY: l'heure d'enregistrement se lit dans le fuseau des familles (Gabon, UTC+1 sans heure
// d'été), pas en UTC ; le décalage reste écrit pour lever toute ambiguïté.
const LIBREVILLE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Libreville',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

/** Date ISO à l'heure de Libreville, avec son décalage ; la valeur brute si elle est illisible. */
function librevilleIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const p = Object.fromEntries(LIBREVILLE.formatToParts(date).map((x) => [x.type, x.value]));
  const offset = (p.timeZoneName ?? '').replace('GMT', '') || '+00:00';
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offset}`;
}

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Registre complet au format CSV : une ligne par mouvement, annulations comprises, montants
 * entiers en XAF. Séparateur « ; » par défaut (français), « , » pour l'export anglais.
 *
 * @example
 * ledgerCsv(rows, new Map([[lineId, 'Cercueil']]), labels); // '﻿"Date";"Type";…\r\n…'
 */
export function ledgerCsv(
  rows: readonly ExportRow[],
  lineLabels: ReadonlyMap<string, string>,
  labels: CsvLabels,
  separator: CsvSeparator = ';',
): string {
  const header = CSV_COLUMNS.map((column) => cell(labels.columns[column])).join(separator);
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
      r.reversesKind ? labels.kind[r.reversesKind] : '',
      r.pledgeId ?? '',
      r.id,
      librevilleIso(r.createdAt),
    ]
      .map(cell)
      .join(separator),
  );
  return `${BOM}${[header, ...body].join('\r\n')}\r\n`;
}

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
  'id',
  'createdAt',
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

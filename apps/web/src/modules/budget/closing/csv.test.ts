import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, ledgerCsv, type CsvColumn, type CsvLabels } from './csv';
import type { ExportRow } from './schema';

const labels: CsvLabels = {
  columns: Object.fromEntries(CSV_COLUMNS.map((c) => [c, c.toUpperCase()])) as CsvLabels['columns'],
  kind: {
    pledge: 'Promesse',
    receipt: 'Cotisation reçue',
    expense: 'Dépense',
    reversal: 'Annulation',
  },
  method: {
    cash: 'Espèces',
    airtel_money: 'Airtel Money',
    moov_money: 'Moov Money',
    transfer: 'Virement',
    card: 'Carte',
    other: 'Autre',
  },
};

const row = (over: Partial<ExportRow>): ExportRow => ({
  id: 'e1',
  kind: 'expense',
  amount: 25_000,
  method: 'cash',
  partyName: 'Pompes funèbres',
  budgetLineId: 'l1',
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  reversesKind: null,
  pledgeId: null,
  createdAt: '2026-10-20T10:00:00Z',
  ...over,
});

const lines = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

// WHY: le `Record` fait échouer le typecheck si un champ est ajouté à `ExportRow` sans colonne.
const COLUMN_OF: Record<keyof ExportRow, CsvColumn> = {
  occurredOn: 'date',
  kind: 'kind',
  amount: 'amount',
  method: 'method',
  partyName: 'party',
  budgetLineId: 'line',
  note: 'note',
  reversesId: 'reverses',
  reversesKind: 'reversesKind',
  pledgeId: 'pledge',
  id: 'id',
  createdAt: 'createdAt',
};

describe('colonnes de l’export', () => {
  it('chaque champ de ExportRow a sa colonne, et chaque colonne son champ', () => {
    expect(Object.values(COLUMN_OF).sort()).toEqual([...CSV_COLUMNS].sort());
  });
});

describe('ledgerCsv', () => {
  it('commence par le BOM et l’en-tête, sépare par « ; » et termine par CRLF', () => {
    const csv = ledgerCsv([], new Map(), labels);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(lines(csv)[0]).toBe(
      '"DATE";"KIND";"AMOUNT";"METHOD";"PARTY";"LINE";"NOTE";"REVERSES";"REVERSESKIND";"PLEDGE";"ID";"CREATEDAT"',
    );
  });

  it('écrit chaque ligne avec ses libellés, son poste et la ligne annulée', () => {
    const csv = ledgerCsv(
      [
        row({}),
        row({
          id: 'v1',
          kind: 'reversal',
          method: null,
          budgetLineId: null,
          reversesId: 'e1',
          reversesKind: 'expense',
        }),
      ],
      new Map([['l1', 'Cercueil']]),
      labels,
    );
    expect(lines(csv)[1]).toBe(
      '"2026-10-20";"Dépense";"25000";"Espèces";"Pompes funèbres";"Cercueil";"";"";"";"";"e1";"2026-10-20T11:00:00+01:00"',
    );
    expect(lines(csv)[2]).toBe(
      '"2026-10-20";"Annulation";"25000";"";"Pompes funèbres";"";"";"e1";"Dépense";"";"v1";"2026-10-20T11:00:00+01:00"',
    );
  });

  it('écrit la promesse liée à une cotisation', () => {
    const csv = ledgerCsv(
      [row({ id: 'r1', kind: 'receipt', budgetLineId: null, pledgeId: 'p1' })],
      new Map(),
      labels,
    );
    expect(lines(csv)[1]).toContain('"";"";"p1";"r1";');
  });

  it('double les guillemets et garde un retour à la ligne dans sa cellule', () => {
    const csv = ledgerCsv([row({ note: 'Dit "merci"\nà tous' })], new Map(), labels);
    expect(csv).toContain('"Dit ""merci""\nà tous"');
  });

  it('neutralise une cellule qui serait lue comme une formule', () => {
    for (const value of [
      '=SUM(A1)',
      '+33',
      '-2',
      '@cmd',
      '\tx',
      '\rx',
      ' =1',
      '\n=1',
      '＝1',
      '＋1',
      '－1',
      '＠1',
    ]) {
      const csv = ledgerCsv([row({ partyName: value })], new Map(), labels);
      expect(csv).toContain(`"'${value}"`);
    }
  });

  it('laisse un montant tel quel, sans apostrophe', () => {
    const csv = ledgerCsv([row({})], new Map(), labels);
    expect(lines(csv)[1]).toContain(';"25000";');
    expect(csv).not.toContain("'25000");
  });

  it('écrit l’heure d’enregistrement à Libreville (UTC+1), même au changement de jour', () => {
    const csv = ledgerCsv([row({ createdAt: '2026-10-20T23:30:00Z' })], new Map(), labels);
    expect(lines(csv)[1]?.endsWith('"2026-10-21T00:30:00+01:00"')).toBe(true);
  });

  it('garde une date illisible telle quelle', () => {
    const csv = ledgerCsv([row({ createdAt: 'inconnue' })], new Map(), labels);
    expect(lines(csv)[1]?.endsWith('"inconnue"')).toBe(true);
  });
});

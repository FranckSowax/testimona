import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExpenseSchema,
  PledgeSchema,
  ReceiptSchema,
  ReversalSchema,
  VisibilitySchema,
} from './schema';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const KEY = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  idempotencyKey: KEY,
  partyName: '  Oncle Paul ',
  amount: '200 000',
  note: '',
  occurredOn: '2026-10-20',
};

describe('schémas du registre', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T23:30:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('nettoie le nom et lit un montant saisi avec des espaces', () => {
    expect(PledgeSchema.parse(base)).toMatchObject({ partyName: 'Oncle Paul', amount: 200_000 });
  });

  it('refuse un montant nul, trop grand ou mal formé', () => {
    const issue = (amount: string) =>
      PledgeSchema.safeParse({ ...base, amount }).error?.issues[0]?.message;
    expect(issue('0')).toBe('out of range');
    expect(issue('100000001')).toBe('out of range');
    expect(issue('12,5')).toBe('invalid number');
    expect(issue('')).toBe('invalid number');
  });

  it('refuse une date future ou mal formée, accepte une date vide comme aujourd’hui à Libreville', () => {
    const issue = (occurredOn: string) =>
      PledgeSchema.safeParse({ ...base, occurredOn }).error?.issues[0]?.message;
    expect(issue('2999-01-01')).toBe('invalid date');
    expect(issue('2026-02-30')).toBe('invalid date');
    expect(issue('1999-12-31')).toBe('invalid date');
    // Horloge : 2026-10-27 23:30 UTC, soit déjà le 28 à Libreville (UTC+1).
    expect(PledgeSchema.parse({ ...base, occurredOn: '' }).occurredOn).toBe('2026-10-28');
    // Plafond : le lendemain de la date UTC est accepté, le surlendemain refusé.
    expect(PledgeSchema.safeParse({ ...base, occurredOn: '2026-10-28' }).success).toBe(true);
    expect(issue('2026-10-29')).toBe('invalid date');
  });

  it('lit les espaces insécables et fines dans un montant, et ignore les zéros de tête', () => {
    expect(PledgeSchema.parse({ ...base, amount: '200\u00a0000' }).amount).toBe(200_000);
    expect(PledgeSchema.parse({ ...base, amount: '1\u202f500' }).amount).toBe(1_500);
    expect(PledgeSchema.parse({ ...base, amount: '0012' }).amount).toBe(12);
    expect(
      PledgeSchema.safeParse({ ...base, amount: '9'.repeat(400) }).error?.issues[0]?.message,
    ).toBe('out of range');
    expect(
      PledgeSchema.safeParse({ ...base, amount: '1234567890' }).error?.issues[0]?.message,
    ).toBe('out of range');
  });

  it('contrôle le nom et la note en caractères', () => {
    const issue = (over: object) =>
      PledgeSchema.safeParse({ ...base, ...over }).error?.issues[0]?.message;
    expect(issue({ partyName: 'Paul\u0000' })).toBe('invalid character');
    expect(issue({ partyName: 'a'.repeat(121) })).toBe('too long');
    expect(issue({ note: 'a'.repeat(501) })).toBe('too long');
    expect(PledgeSchema.safeParse({ ...base, partyName: '😀'.repeat(120) }).success).toBe(true);
    const withoutNote: Record<string, string> = { ...base };
    delete withoutNote.note;
    expect(PledgeSchema.parse(withoutNote).note).toBe('');
  });

  it('exige un moyen de paiement connu pour une cotisation reçue ou une dépense', () => {
    expect(ReceiptSchema.safeParse({ ...base, method: 'bitcoin' }).success).toBe(false);
    expect(ExpenseSchema.parse({ ...base, method: 'airtel_money' }).method).toBe('airtel_money');
  });

  it('transforme un membre ou une promesse vide en null', () => {
    const parsed = ReceiptSchema.parse({ ...base, method: 'cash', memberId: '', pledgeId: '' });
    expect(parsed).toMatchObject({ memberId: null, pledgeId: null });
  });

  it('valide une annulation et un réglage de visibilité', () => {
    expect(
      ReversalSchema.safeParse({ dossierId: DOSSIER, idempotencyKey: KEY, entryId: KEY }).success,
    ).toBe(true);
    expect(VisibilitySchema.safeParse({ dossierId: DOSSIER, visibility: 'public' }).success).toBe(
      false,
    );
  });
});

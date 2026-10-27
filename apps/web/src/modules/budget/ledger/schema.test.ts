import { describe, expect, it } from 'vitest';
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

  it('refuse une date future ou mal formée, accepte une date vide comme aujourd’hui', () => {
    const issue = (occurredOn: string) =>
      PledgeSchema.safeParse({ ...base, occurredOn }).error?.issues[0]?.message;
    expect(issue('2999-01-01')).toBe('invalid date');
    expect(issue('2026-02-30')).toBe('invalid date');
    expect(PledgeSchema.parse({ ...base, occurredOn: '' }).occurredOn).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
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

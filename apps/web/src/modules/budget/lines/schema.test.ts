import { describe, expect, it } from 'vitest';
import {
  DossierRefSchema,
  LineRefSchema,
  LineSchema,
  NewLineSchema,
  ScenarioSchema,
} from './schema';

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const base = {
  dossierId: DOSSIER,
  label: '  Traiteur ',
  sober: '200 000',
  intermediate: '0',
  full: '1 000 000',
};

describe('schémas des postes', () => {
  it('nettoie le libellé et lit des montants avec espaces, zéro compris', () => {
    expect(NewLineSchema.parse(base)).toEqual({
      dossierId: DOSSIER,
      label: 'Traiteur',
      sober: 200_000,
      intermediate: 0,
      full: 1_000_000,
    });
  });

  it('refuse un montant négatif, trop grand ou mal formé', () => {
    const issue = (sober: string) =>
      NewLineSchema.safeParse({ ...base, sober }).error?.issues[0]?.message;
    expect(issue('-1')).toBe('invalid number');
    expect(issue('100000001')).toBe('out of range');
    expect(issue('9'.repeat(400))).toBe('out of range');
    expect(issue('12,5')).toBe('invalid number');
    expect(issue('')).toBe('invalid number');
  });

  it('refuse un libellé vide, trop long ou avec un caractère NUL', () => {
    const issue = (label: string) =>
      NewLineSchema.safeParse({ ...base, label }).error?.issues[0]?.message;
    expect(issue('  ')).toBe('required');
    expect(issue('a'.repeat(121))).toBe('too long');
    expect(issue('a\u0000b')).toBe('invalid character');
    expect(NewLineSchema.safeParse({ ...base, label: '🌺'.repeat(120) }).success).toBe(true);
  });

  it('exige l’identifiant du poste pour une modification', () => {
    expect(LineSchema.safeParse(base).success).toBe(false);
    expect(LineSchema.parse({ ...base, lineId: LINE }).lineId).toBe(LINE);
  });

  it('accepte un scénario connu ou aucun', () => {
    expect(ScenarioSchema.parse({ dossierId: DOSSIER, scenario: 'full' }).scenario).toBe('full');
    expect(ScenarioSchema.parse({ dossierId: DOSSIER, scenario: '' }).scenario).toBeNull();
    expect(ScenarioSchema.safeParse({ dossierId: DOSSIER, scenario: 'luxe' }).success).toBe(false);
  });

  it('accepte la borne haute et des espaces insécables', () => {
    expect(NewLineSchema.parse({ ...base, sober: '100000000' }).sober).toBe(100_000_000);
    expect(NewLineSchema.parse({ ...base, sober: '200\u00a0000' }).sober).toBe(200_000);
    expect(NewLineSchema.parse({ ...base, sober: '200\u202f000' }).sober).toBe(200_000);
    expect(NewLineSchema.parse({ ...base, sober: '200 000' }).sober).toBe(200_000);
  });

  it('refuse un identifiant invalide pour un poste ou un dossier', () => {
    expect(LineRefSchema.safeParse({ dossierId: DOSSIER, lineId: 'nope' }).success).toBe(false);
    expect(LineRefSchema.safeParse({ dossierId: 'nope', lineId: LINE }).success).toBe(false);
    expect(DossierRefSchema.safeParse({ dossierId: 'nope' }).success).toBe(false);
    expect(DossierRefSchema.safeParse({ dossierId: DOSSIER }).success).toBe(true);
  });
});

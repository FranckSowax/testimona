import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { answersRepo, dossierRepo } = vi.hoisted(() => ({
  answersRepo: { upsertAnswer: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { saveDocumentText } = await import('./texts-service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const dossier = (entryPoint: 'death' | 'prepare' | 'after') => ({
  id: DOSSIER,
  title: 'Jean Ndong',
  city: 'Libreville',
  countryCode: 'GA',
  entryPoint,
  createdAt: '2026-10-27T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getDossier.mockResolvedValue(dossier('death'));
  answersRepo.upsertAnswer.mockResolvedValue({ data: true, error: null });
});

describe('saveDocumentText', () => {
  it('enregistre le texte nettoyé sous la clé de son type', async () => {
    const res = await saveDocumentText({
      dossierId: DOSSIER,
      kind: 'tribute',
      text: '  Une vie\r\nde partage  ',
    });
    expect(res).toEqual({ ok: true, data: { key: 'documents.booklet.tribute' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'documents.booklet.tribute',
      value: 'Une vie\nde partage',
    });
  });

  it('refuse une entrée mal formée sans lire le dossier', async () => {
    for (const raw of [
      null,
      'texte',
      { dossierId: 'abc', kind: 'cover', text: 'x' },
      { dossierId: DOSSIER, kind: 'poster', text: 'x' },
      { dossierId: DOSSIER, kind: 'cover', text: 42 },
    ]) {
      expect(await saveDocumentText(raw)).toEqual({ ok: false, error: 'validation' });
    }
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse un texte vide ou trop long avec ses erreurs de champ', async () => {
    const empty = await saveDocumentText({ dossierId: DOSSIER, kind: 'cover', text: ' ' });
    expect(empty).toEqual({ ok: false, error: 'validation', fieldErrors: { '': 'empty' } });
    const long = await saveDocumentText({
      dossierId: DOSSIER,
      kind: 'thanks',
      text: 'a'.repeat(601),
    });
    expect(long).toEqual({ ok: false, error: 'validation', fieldErrors: { '': 'too long' } });
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('renvoie « not_found » si le dossier est inaccessible', async () => {
    dossierRepo.getDossier.mockResolvedValue(null);
    const res = await saveDocumentText({ dossierId: DOSSIER, kind: 'cover', text: 'x' });
    expect(res).toEqual({ ok: false, error: 'not_found' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse un dossier où l’étape 3.5 est fermée', async () => {
    for (const entryPoint of ['prepare', 'after'] as const) {
      dossierRepo.getDossier.mockResolvedValue(dossier(entryPoint));
      const res = await saveDocumentText({ dossierId: DOSSIER, kind: 'cover', text: 'x' });
      expect(res).toEqual({ ok: false, error: 'validation' });
    }
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('traduit le refus RLS d’un lecteur en « forbidden »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    const res = await saveDocumentText({ dossierId: DOSSIER, kind: 'cover', text: 'x' });
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });
});

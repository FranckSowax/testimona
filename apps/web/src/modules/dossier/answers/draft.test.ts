import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { answersRepo, dossierRepo } = vi.hoisted(() => ({
  answersRepo: { upsertAnswer: vi.fn(), listAnswers: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => answersRepo);
vi.mock('../repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { saveAnswer, saveDraft } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const dossier = (entryPoint: 'death' | 'prepare') => ({
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

describe('saveDraft', () => {
  it('enregistre le texte nettoyé sous la clé du brouillon de l’étape', async () => {
    const res = await saveDraft({
      dossierId: DOSSIER,
      stepId: 'immediate-message',
      text: '  Bonjour  ',
    });
    expect(res).toEqual({ ok: true, data: { key: 'announce.whatsapp.text' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'announce.whatsapp.text',
      value: 'Bonjour',
    });
  });

  it('refuse une étape inconnue ou sans brouillon', async () => {
    for (const stepId of ['nope', 'biography', 'broadcast-list']) {
      expect(await saveDraft({ dossierId: DOSSIER, stepId, text: 'x' })).toEqual({
        ok: false,
        error: 'validation',
      });
    }
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('refuse un texte vide ou trop long', async () => {
    const empty = await saveDraft({ dossierId: DOSSIER, stepId: 'email-announcement', text: ' ' });
    expect(empty).toMatchObject({ ok: false, error: 'validation' });
    const long = await saveDraft({
      dossierId: DOSSIER,
      stepId: 'email-announcement',
      text: 'x'.repeat(12_001),
    });
    expect(long).toMatchObject({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse un dossier inaccessible ou une étape fermée pour sa porte', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'not_found' },
    );
    dossierRepo.getDossier.mockResolvedValueOnce(dossier('prepare'));
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'validation' },
    );
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('traduit le refus RLS d’un lecteur en « forbidden »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'forbidden' },
    );
  });

  it('ne laisse pas saveAnswer écrire une clé de brouillon', async () => {
    expect(
      await saveAnswer({ dossierId: DOSSIER, key: 'announce.whatsapp.text', value: 'x' }),
    ).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });
});

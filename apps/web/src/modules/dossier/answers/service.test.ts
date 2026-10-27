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

const { saveAnswer } = await import('./service');
const { SKIPPED } = await import('@/journey/types');

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
  answersRepo.listAnswers.mockResolvedValue({});
});

describe('saveAnswer', () => {
  it('refuse une clé absente du registre sans toucher la base', async () => {
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'creator.relationship', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('refuse un identifiant de dossier invalide', async () => {
    const res = await saveAnswer({ dossierId: 'abc', key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('renvoie les erreurs de champ d’une réponse invalide', async () => {
    const res = await saveAnswer({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: '', countryCode: 'GA' },
    });
    expect(res).toMatchObject({ ok: false, error: 'validation' });
    expect(res.ok === false && res.fieldErrors?.city).toBeTruthy();
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse une réponse dépassant la taille maximale sans toucher la base', async () => {
    // 10 anecdotes de 4000 caractères CJK (3 octets chacun) : environ 120 000 octets.
    const traits = Array.from({ length: 10 }, () => ({
      trait: 'courage',
      anecdote: '話'.repeat(4000),
    }));
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.traits', value: traits });
    expect(res).toMatchObject({ ok: false, error: 'validation' });
    expect(res.ok === false && res.fieldErrors?.['']).toBe('too large');
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('enregistre la réponse nettoyée', async () => {
    const res = await saveAnswer({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: ' Lambaréné ', countryCode: 'ga' },
    });
    expect(res).toEqual({ ok: true, data: { key: 'biography.birthPlace' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: 'Lambaréné', countryCode: 'GA' },
    });
  });

  it('enregistre « passée »', async () => {
    const res = await saveAnswer({
      dossierId: DOSSIER,
      key: 'biography.motto',
      value: { skipped: true },
    });
    expect(res).toEqual({ ok: true, data: { key: 'biography.motto' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'biography.motto',
      value: { skipped: true },
    });
  });

  it('« passer » ne remplace pas une réponse existante', async () => {
    answersRepo.listAnswers.mockResolvedValue({ 'biography.motto': 'Toujours debout' });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: SKIPPED });
    expect(res).toEqual({ ok: true, data: { key: 'biography.motto' } });
    expect(answersRepo.listAnswers).toHaveBeenCalledWith(DOSSIER, ['biography.motto']);
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('« passer » une question déjà passée réécrit « passée »', async () => {
    answersRepo.listAnswers.mockResolvedValue({ 'biography.motto': SKIPPED });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: SKIPPED });
    expect(res).toEqual({ ok: true, data: { key: 'biography.motto' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'biography.motto',
      value: { skipped: true },
    });
  });

  it('une vraie réponse ne relit pas les réponses existantes', async () => {
    await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(answersRepo.listAnswers).not.toHaveBeenCalled();
    expect(answersRepo.upsertAnswer).toHaveBeenCalled();
  });

  it('renvoie « not_found » si le dossier est inaccessible', async () => {
    dossierRepo.getDossier.mockResolvedValue(null);
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'not_found' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse une étape fermée pour la porte du dossier', async () => {
    dossierRepo.getDossier.mockResolvedValue(dossier('after'));
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('traduit le refus RLS d’un lecteur en « forbidden »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });

  it('traduit 23514 en « validation »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'x' },
    });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
  });

  it('code inconnu : « unknown », journalisation sans contenu de réponse', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'secret-contenu' },
    });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'secret' });
    expect(res).toEqual({ ok: false, error: 'unknown' });
    expect(spy).toHaveBeenCalledWith('[dossier] saveAnswer failed', { code: 'XX000' });
    spy.mockRestore();
  });
});

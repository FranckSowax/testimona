import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { aiRepo, answersRepo, dossierRepo } = vi.hoisted(() => ({
  aiRepo: { consumeAiQuota: vi.fn() },
  answersRepo: { listAnswersResult: vi.fn() },
  dossierRepo: { getDossier: vi.fn(), getPerson: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => aiRepo);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);

const { improveDraft } = await import('./service');
const { AiProviderError } = await import('./provider');
const { AI_ANSWER_KEYS } = await import('./facts');
const { DRAFT_MAX } = await import('@/journey/types');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const input = (over: Record<string, unknown> = {}) => ({
  dossierId: DOSSIER,
  stepId: 'immediate-message',
  locale: 'fr',
  text: 'Brouillon de la famille',
  ...over,
});
const provider = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  dossierRepo.getDossier.mockResolvedValue({
    id: DOSSIER,
    title: 'Jean Ndong',
    city: 'Libreville',
    countryCode: 'GA',
    entryPoint: 'death',
    createdAt: '2026-10-27T00:00:00Z',
  });
  dossierRepo.getPerson.mockResolvedValue({
    firstName: 'Jean',
    lastName: 'Ndong',
    nickname: null,
    birthDate: null,
    deathDate: '2026-10-01',
  });
  answersRepo.listAnswersResult.mockResolvedValue({
    data: { 'announce.tone': 'neutral' },
    error: null,
  });
  aiRepo.consumeAiQuota.mockResolvedValue({ data: true, error: null });
  provider.mockResolvedValue('Texte amélioré');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('improveDraft', () => {
  it('renvoie unavailable sans clé, sans rien lire ni consommer', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'unavailable' });
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
  });

  it('refuse une entrée invalide, une étape sans brouillon ou un texte vide', async () => {
    expect(await improveDraft(input({ dossierId: 'x' }), provider)).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(await improveDraft(input({ stepId: 'biography' }), provider)).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(await improveDraft(input({ text: '   ' }), provider)).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(await improveDraft(input({ locale: 'de' }), provider)).toEqual({
      ok: false,
      error: 'validation',
    });
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
  });

  it('renvoie not_found pour un dossier illisible et validation pour une étape fermée', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'not_found' });
    dossierRepo.getDossier.mockResolvedValueOnce({
      id: DOSSIER,
      title: 't',
      city: 'c',
      countryCode: 'GA',
      entryPoint: 'prepare',
      createdAt: '',
    });
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'validation' });
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
  });

  it('renvoie quota quand le plafond est atteint, sans appeler l’IA', async () => {
    aiRepo.consumeAiQuota.mockResolvedValue({ data: false, error: null });
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'quota' });
    expect(provider).not.toHaveBeenCalled();
  });

  it('traduit un refus de la base en forbidden', async () => {
    aiRepo.consumeAiQuota.mockResolvedValue({ data: null, error: { code: '42501', message: 'x' } });
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'forbidden' });
    expect(provider).not.toHaveBeenCalled();
  });

  it('consomme le quota avant l’appel et renvoie le texte amélioré', async () => {
    const res = await improveDraft(input(), provider);
    expect(res).toEqual({ ok: true, text: 'Texte amélioré' });
    expect(aiRepo.consumeAiQuota).toHaveBeenCalledWith(DOSSIER);
    expect(aiRepo.consumeAiQuota.mock.invocationCallOrder[0]).toBeLessThan(
      provider.mock.invocationCallOrder[0]!,
    );
  });

  it('ne lit que les réponses de la liste blanche et n’envoie aucun contact', async () => {
    answersRepo.listAnswersResult.mockResolvedValue({
      data: {
        'announce.tone': 'neutral',
        'broadcast.contacts': [{ name: 'Marie', phone: '+241 01 23 45 67' }],
      },
      error: null,
    });
    await improveDraft(input(), provider);
    expect(answersRepo.listAnswersResult).toHaveBeenCalledWith(DOSSIER, AI_ANSWER_KEYS);
    const prompt = provider.mock.calls[0]![0] as { system: string; user: string };
    expect(prompt.user).toContain('Brouillon de la famille');
    expect(prompt.user).not.toContain('+241');
    expect(prompt.user).not.toContain('Marie');
  });

  it('renvoie failed si les réponses sont illisibles, sans consommer le quota', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    answersRepo.listAnswersResult.mockResolvedValue({ data: {}, error: { code: 'XX000' } });
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'failed' });
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it('renvoie failed si l’IA échoue ou rend un texte invalide', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    provider.mockRejectedValueOnce(new AiProviderError('refusal'));
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'failed' });
    provider.mockResolvedValueOnce('x'.repeat(DRAFT_MAX + 1));
    expect(await improveDraft(input(), provider)).toEqual({ ok: false, error: 'failed' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('Brouillon de la famille');
    spy.mockRestore();
  });
});

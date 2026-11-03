import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { aiRepo, answersRepo, dossierRepo } = vi.hoisted(() => ({
  aiRepo: { consumeAiQuota: vi.fn() },
  answersRepo: { listAnswersResult: vi.fn() },
  dossierRepo: { getDossier: vi.fn(), getPersonResult: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => aiRepo);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);

const { generateDocumentTexts, openRouterDocumentsProvider } = await import('./documents');
const { AiProviderError } = await import('./provider');
const { DOCUMENT_AI_KEYS } = await import('./documents-facts');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const input = (over: Record<string, unknown> = {}) => ({
  dossierId: DOSSIER,
  locale: 'fr',
  ...over,
});
const TEXTS = {
  cover: 'Ton sourire restera dans nos cœurs.',
  tribute: 'Jean était un homme généreux, instituteur aimé de ses élèves.',
  thanks: 'La famille remercie chaleureusement tous ceux qui l’ont entourée.',
};
const provider = vi.fn();
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
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  dossierRepo.getDossier.mockResolvedValue(dossier('death'));
  dossierRepo.getPersonResult.mockResolvedValue({
    data: {
      firstName: 'Jean',
      lastName: 'Ndong',
      nickname: null,
      birthDate: '1950-02-14',
      deathDate: '2026-10-01',
    },
    error: null,
  });
  answersRepo.listAnswersResult.mockResolvedValue({
    data: { 'ceremony.tone': 'neutral', 'biography.career': 'Instituteur.' },
    error: null,
  });
  aiRepo.consumeAiQuota.mockResolvedValue({ data: true, error: null });
  provider.mockResolvedValue(JSON.stringify(TEXTS));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('generateDocumentTexts', () => {
  it('renvoie unavailable sans clé, sans rien lire ni consommer', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(await generateDocumentTexts(input(), provider)).toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
  });

  it('refuse une entrée invalide', async () => {
    for (const raw of [input({ dossierId: 'x' }), input({ locale: 'de' }), null, 'x']) {
      expect(await generateDocumentTexts(raw, provider)).toEqual({
        ok: false,
        error: 'validation',
      });
    }
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('renvoie not_found pour un dossier illisible et validation quand l’étape 3.5 est fermée', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await generateDocumentTexts(input(), provider)).toEqual({
      ok: false,
      error: 'not_found',
    });
    for (const entryPoint of ['prepare', 'after'] as const) {
      dossierRepo.getDossier.mockResolvedValueOnce(dossier(entryPoint));
      expect(await generateDocumentTexts(input(), provider)).toEqual({
        ok: false,
        error: 'validation',
      });
    }
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it('renvoie les trois textes, après un seul appel compté', async () => {
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: true, texts: TEXTS });
    expect(aiRepo.consumeAiQuota).toHaveBeenCalledTimes(1);
    expect(aiRepo.consumeAiQuota).toHaveBeenCalledWith(DOSSIER);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(aiRepo.consumeAiQuota.mock.invocationCallOrder[0]).toBeLessThan(
      provider.mock.invocationCallOrder[0]!,
    );
  });

  it('lit avant de consommer le quota, et seulement les réponses de la liste blanche', async () => {
    await generateDocumentTexts(input(), provider);
    expect(answersRepo.listAnswersResult).toHaveBeenCalledWith(DOSSIER, DOCUMENT_AI_KEYS);
    expect(answersRepo.listAnswersResult.mock.invocationCallOrder[0]).toBeLessThan(
      aiRepo.consumeAiQuota.mock.invocationCallOrder[0]!,
    );
    expect(dossierRepo.getPersonResult.mock.invocationCallOrder[0]).toBeLessThan(
      aiRepo.consumeAiQuota.mock.invocationCallOrder[0]!,
    );
  });

  it("n'envoie ni le nom, ni les dates, ni le titre du dossier", async () => {
    await generateDocumentTexts(input(), provider);
    dossierRepo.getPersonResult.mockResolvedValue({ data: null, error: null });
    await generateDocumentTexts(input(), provider);
    for (const call of provider.mock.calls) {
      const prompt = call[0] as { system: string; user: string };
      expect(prompt.user).toContain('Instituteur.');
      for (const forbidden of ['Ndong', '1950', '2026-10-01', 'Libreville']) {
        expect(prompt.system + prompt.user).not.toContain(forbidden);
      }
    }
  });

  it('accepte un bloc ```json, mais rien d’autre autour du JSON', async () => {
    provider.mockResolvedValueOnce(`\`\`\`json\n${JSON.stringify(TEXTS)}\n\`\`\``);
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: true, texts: TEXTS });
    provider.mockResolvedValueOnce(`Voici les textes : ${JSON.stringify(TEXTS)}`);
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'failed' });
    provider.mockResolvedValueOnce(`\`\`\`json\n${JSON.stringify(TEXTS)}\n\`\`\`\nBonne journée`);
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'failed' });
  });

  it('nettoie chaque texte comme le schéma du livret', async () => {
    provider.mockResolvedValueOnce(
      JSON.stringify({ ...TEXTS, cover: '  Ligne un\r\nLigne deux  ' }),
    );
    const res = await generateDocumentTexts(input(), provider);
    expect(res).toEqual({ ok: true, texts: { ...TEXTS, cover: 'Ligne un\nLigne deux' } });
  });

  it('renvoie failed pour un JSON invalide, incomplet ou avec une clé en trop', async () => {
    for (const response of [
      'pas du JSON',
      JSON.stringify({ cover: TEXTS.cover, tribute: TEXTS.tribute }),
      JSON.stringify({ ...TEXTS, thanks: '   ' }),
      JSON.stringify({ ...TEXTS, extra: 'x' }),
      JSON.stringify({ ...TEXTS, tribute: 42 }),
      JSON.stringify([TEXTS]),
    ]) {
      provider.mockResolvedValueOnce(response);
      expect(await generateDocumentTexts(input(), provider)).toEqual({
        ok: false,
        error: 'failed',
      });
    }
  });

  it('renvoie failed pour un texte trop long', async () => {
    for (const over of [
      { cover: 'x'.repeat(201) },
      { tribute: 'x'.repeat(1501) },
      { thanks: 'x'.repeat(601) },
    ]) {
      provider.mockResolvedValueOnce(JSON.stringify({ ...TEXTS, ...over }));
      expect(await generateDocumentTexts(input(), provider)).toEqual({
        ok: false,
        error: 'failed',
      });
    }
  });

  it('renvoie failed quand un texte contient une heure', async () => {
    for (const time of ['9:30', '14h05', '10 h 30', '08H00']) {
      provider.mockResolvedValueOnce(
        JSON.stringify({ ...TEXTS, thanks: `Rendez-vous à ${time} pour le recueillement.` }),
      );
      expect(await generateDocumentTexts(input(), provider)).toEqual({
        ok: false,
        error: 'failed',
      });
    }
    provider.mockResolvedValueOnce(
      JSON.stringify({ ...TEXTS, tribute: 'Il a enseigné 30 ans à 120 élèves.' }),
    );
    expect((await generateDocumentTexts(input(), provider)).ok).toBe(true);
  });

  it('renvoie failed si l’IA échoue, sans journaliser les faits', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    provider.mockRejectedValueOnce(new AiProviderError('refusal'));
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'failed' });
    expect(spy).toHaveBeenCalledWith('[ai] generateDocumentTexts failed', { reason: 'refusal' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('Instituteur');
  });

  it('renvoie quota quand le plafond est atteint, sans appeler l’IA', async () => {
    aiRepo.consumeAiQuota.mockResolvedValue({ data: false, error: null });
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'quota' });
    expect(provider).not.toHaveBeenCalled();
  });

  it('renvoie failed si une lecture échoue, sans consommer le quota', async () => {
    answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: { code: 'XX000' } });
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'failed' });
    dossierRepo.getPersonResult.mockResolvedValueOnce({ data: null, error: { code: 'XX000' } });
    expect(await generateDocumentTexts(input(), provider)).toEqual({ ok: false, error: 'failed' });
    expect(aiRepo.consumeAiQuota).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });
});

describe('openRouterDocumentsProvider', () => {
  it('demande un effort bas et une réponse bornée, avec le prompt système et utilisateur', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }),
          { status: 200 },
        ),
      );
    await openRouterDocumentsProvider('key', { fetchImpl })({ system: 'S', user: 'U' });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true });
    expect(body.max_tokens).toBeLessThanOrEqual(8_000);
    expect(body.provider).toEqual({ data_collection: 'deny' });
    expect(body.messages).toEqual([
      { role: 'system', content: 'S' },
      { role: 'user', content: 'U' },
    ]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { openRouterProvider, AiProviderError } = await import('./provider');

const PROMPT = { system: 'SYSTEM', user: 'Texte confidentiel de la famille' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const reply = (choice: Record<string, unknown> = {}) =>
  json({
    choices: [{ finish_reason: 'stop', message: { content: '  Texte amélioré.  ' }, ...choice }],
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openRouterProvider', () => {
  it('appelle OpenRouter avec le modèle, un effort bas et sans collecte de données', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply());
    await openRouterProvider('test-key', fetchMock)(PROMPT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'anthropic/claude-opus-5.5',
      max_tokens: 16_000,
      reasoning: { effort: 'low', exclude: true },
      provider: { data_collection: 'deny' },
      messages: [
        { role: 'system', content: 'SYSTEM' },
        { role: 'user', content: 'Texte confidentiel de la famille' },
      ],
    });
  });

  it('renvoie le texte de la réponse, nettoyé', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply());
    await expect(openRouterProvider('k', fetchMock)(PROMPT)).resolves.toBe('Texte amélioré.');
  });

  it('signale un filtrage, une réponse tronquée, vide ou en erreur', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = (response: Response) =>
      openRouterProvider('k', vi.fn().mockResolvedValue(response))(PROMPT);
    await expect(run(reply({ finish_reason: 'content_filter' }))).rejects.toMatchObject({
      reason: 'refusal',
    });
    await expect(run(reply({ finish_reason: 'length' }))).rejects.toMatchObject({
      reason: 'truncated',
    });
    await expect(run(reply({ message: { content: '  ' } }))).rejects.toMatchObject({
      reason: 'empty',
    });
    await expect(run(reply({ message: { content: null } }))).rejects.toMatchObject({
      reason: 'empty',
    });
    await expect(run(reply({ error: { code: 502 } }))).rejects.toMatchObject({ reason: 'api' });
    await expect(run(json({ unexpected: true }))).rejects.toMatchObject({ reason: 'api' });
  });

  it('réessaie une fois une erreur passagère', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { code: 503, message: 'busy' } }, 503))
      .mockResolvedValueOnce(reply());
    await expect(openRouterProvider('k', fetchMock)(PROMPT)).resolves.toBe('Texte amélioré.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ne réessaie pas une erreur définitive et ne journalise jamais le texte', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: 401, message: 'no' } }, 401));
    const error = await openRouterProvider('k', fetchMock)(PROMPT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[ai] provider error', { status: 401 });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('confidentiel');
  });

  it('abandonne après deux échecs réseau', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(openRouterProvider('k', fetchMock)(PROMPT)).rejects.toMatchObject({
      reason: 'api',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

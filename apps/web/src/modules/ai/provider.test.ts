import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { openRouterProvider, AiProviderError } = await import('./provider');

const sleep = () => vi.fn().mockResolvedValue(undefined);

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
    await openRouterProvider('test-key', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT);
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
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).resolves.toBe('Texte amélioré.');
  });

  it('signale un filtrage, une réponse tronquée, vide ou en erreur', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const run = (response: Response) =>
      openRouterProvider('k', { fetchImpl: vi.fn().mockResolvedValue(response), sleep: sleep() })(
        PROMPT,
      );
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
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).resolves.toBe('Texte amélioré.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ne réessaie pas une erreur définitive et ne journalise jamais le texte', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: 401, message: 'no' } }, 401));
    const error = await openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(
      PROMPT,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[ai] provider error', { status: 401 });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('confidentiel');
  });

  it('abandonne après deux échecs réseau', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({
      reason: 'api',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("traite finish_reason 'error' comme une erreur d'API, même avec du contenu", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(reply({ finish_reason: 'error' }));
    await expect(
      openRouterProvider('test-key', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(spy).toHaveBeenCalledWith('[ai] provider error', { finish: 'error' });
  });

  it('journalise une erreur de génération sans son contenu', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(reply({ error: { code: 502, message: 'secret' } }));
    await expect(
      openRouterProvider('test-key', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(spy).toHaveBeenCalledWith('[ai] provider error', { choiceError: true });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret');
  });

  it('ne journalise jamais la clé API', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failures = [
      json({ error: { code: 401, message: 'test-key' } }, 401),
      reply({ finish_reason: 'error' }),
      new Response('{"choices":', { status: 200 }),
    ];
    for (const response of failures) {
      const fetchMock = vi.fn().mockResolvedValue(response);
      await openRouterProvider('test-key', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT).catch(
        () => {},
      );
    }
    const network = vi.fn().mockRejectedValue(new TypeError('fetch failed test-key'));
    await openRouterProvider('test-key', { fetchImpl: network, sleep: sleep() })(PROMPT).catch(
      () => {},
    );
    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain('test-key');
  });

  it('échoue après deux 503, avec exactement deux appels et une pause courte', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sleepMock = sleep();
    const fetchMock = vi.fn().mockImplementation(async () => json({ error: { code: 503 } }, 503));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleepMock })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledTimes(1);
    const wait = sleepMock.mock.calls[0]![0] as number;
    expect(wait).toBeGreaterThanOrEqual(500);
    expect(wait).toBeLessThanOrEqual(1000);
  });

  it('respecte Retry-After (secondes) quand il est court', async () => {
    const sleepMock = sleep();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(reply());
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleepMock })(PROMPT),
    ).resolves.toBe('Texte amélioré.');
    expect(sleepMock).toHaveBeenCalledWith(1000);
  });

  it('respecte Retry-After au format date HTTP quand il est court', async () => {
    const sleepMock = sleep();
    const now = () => Date.parse('Wed, 21 Oct 2026 07:28:00 GMT');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 429,
          headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:01 GMT' },
        }),
      )
      .mockResolvedValueOnce(reply());
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleepMock, now })(PROMPT),
    ).resolves.toBe('Texte amélioré.');
    expect(sleepMock).toHaveBeenCalledWith(1000);
  });

  it('ne réessaie pas quand Retry-After (date HTTP) est trop lointain', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sleepMock = sleep();
    const now = () => Date.parse('Wed, 21 Oct 2026 07:28:00 GMT');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 429,
        headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:30:00 GMT' },
      }),
    );
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleepMock, now })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it("libère le corps de la réponse d'erreur finale", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = new Response('{}', { status: 500 });
    const cancel = vi.spyOn(res.body!, 'cancel');
    const fetchMock = vi.fn().mockResolvedValue(res);
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(cancel).toHaveBeenCalled();
  });

  it('ne réessaie pas quand Retry-After est trop long', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sleepMock = sleep();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '120' } }));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleepMock })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('ne réessaie pas si la pause dépasse le budget restant', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let t = 0;
    const now = () => t;
    const fetchMock = vi.fn().mockImplementation(async () => {
      t += 59_800;
      return json({ error: { code: 503 } }, 503);
    });
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep(), now })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classe un JSON tronqué sur un 200 en erreur d'API", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"choices":[', { status: 200 }));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(spy).toHaveBeenCalledWith('[ai] provider error', { read: 'SyntaxError' });
  });

  it('ne réessaie pas après un délai dépassé', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'api' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('signale une réponse tronquée même avec un contenu partiel', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(reply({ finish_reason: 'length', message: { content: 'Début du tex' } }));
    await expect(
      openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT),
    ).rejects.toMatchObject({ reason: 'truncated' });
  });

  it('envoie le même corps aux deux essais', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: { code: 503 } }, 503))
      .mockResolvedValueOnce(reply());
    await openRouterProvider('k', { fetchImpl: fetchMock, sleep: sleep() })(PROMPT);
    const bodies = fetchMock.mock.calls.map((c) => (c[1] as RequestInit).body);
    expect(bodies[0]).toBe(bodies[1]);
  });
});

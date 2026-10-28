import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { completeChat } = await import('./provider');
type ChatPayload = import('./provider').ChatPayload;

const reply = () =>
  new Response(
    JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );

const deps = (fetchMock: ReturnType<typeof vi.fn>) => ({
  fetchImpl: fetchMock,
  sleep: vi.fn().mockResolvedValue(undefined),
});

const sentBody = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body)) as Record<string, unknown>;

describe('completeChat', () => {
  it('impose le modèle et le refus de collecte de données', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply());
    const payload: ChatPayload = { max_tokens: 10, messages: [{ role: 'user', content: 'x' }] };
    expect(await completeChat('k', payload, deps(fetchMock))).toBe('ok');
    expect(sentBody(fetchMock)).toEqual({
      max_tokens: 10,
      messages: [{ role: 'user', content: 'x' }],
      model: 'anthropic/claude-opus-5.5',
      provider: { data_collection: 'deny' },
    });
  });

  it('ne laisse pas un appelant écraser le modèle ni la politique de données', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply());
    const forged = {
      max_tokens: 10,
      messages: [{ role: 'user', content: 'x' }],
      model: 'other/model',
      provider: { data_collection: 'allow' },
    } as unknown as ChatPayload;
    await completeChat('k', forged, deps(fetchMock));
    const body = sentBody(fetchMock);
    expect(body.model).toBe('anthropic/claude-opus-5.5');
    expect(body.provider).toEqual({ data_collection: 'deny' });
  });
});

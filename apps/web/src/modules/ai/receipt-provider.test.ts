import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { openRouterReceiptProvider, RECEIPT_SYSTEM_PROMPT } = await import('./receipt-provider');
const { GRID_KEYS } = await import('@/modules/budget/grid');

const reply = (content: string) =>
  new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('openRouterReceiptProvider', () => {
  it('envoie seulement la consigne et l’image, sans collecte de données', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply('{"amount":1}'));
    const read = openRouterReceiptProvider('k', {
      fetchImpl: fetchMock,
      sleep: vi.fn().mockResolvedValue(undefined),
    });
    expect(await read({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' })).toBe(
      '{"amount":1}',
    );
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'anthropic/claude-opus-5.5',
      max_tokens: 4_000,
      reasoning: { effort: 'low', exclude: true },
      provider: { data_collection: 'deny' },
      messages: [
        { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Read this receipt.' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } },
          ],
        },
      ],
    });
  });

  it('cite chaque clé de la grille dans la consigne', () => {
    for (const key of GRID_KEYS) expect(RECEIPT_SYSTEM_PROMPT).toContain(key);
  });
});

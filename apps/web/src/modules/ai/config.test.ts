import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { isAiEnabled, AI_DAILY_LIMIT, AI_MODEL } = await import('./config');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('config IA', () => {
  it('est désactivée sans clé et activée avec une clé', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(isAiEnabled()).toBe(false);
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    expect(isAiEnabled()).toBe(true);
  });

  it('fixe le modèle et le plafond quotidien de la spec', () => {
    expect(AI_MODEL).toBe('anthropic/claude-opus-5.5');
    expect(AI_DAILY_LIMIT).toBe(20);
  });
});

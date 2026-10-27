import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { generateInvitationToken, hashInvitationToken } = await import('./tokens');

describe('jetons d’invitation', () => {
  it('génère des jetons base64url de 43 caractères, tous différents', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInvitationToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('calcule l’empreinte SHA-256 en hexadécimal', () => {
    expect(hashInvitationToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

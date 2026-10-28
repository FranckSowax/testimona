import { beforeEach, describe, expect, it, vi } from 'vitest';

const { server } = vi.hoisted(() => ({ server: { getCurrentUser: vi.fn() } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => server);

const { isPlatformAdmin } = await import('./platform-admin');

describe('isPlatformAdmin', () => {
  beforeEach(() => server.getCurrentUser.mockReset());

  it('reconnaît le rôle Admin de app_metadata', async () => {
    server.getCurrentUser.mockResolvedValue({ app_metadata: { role: 'Admin' } });
    expect(await isPlatformAdmin()).toBe(true);
  });

  it('ignore user_metadata, modifiable par l’utilisateur', async () => {
    server.getCurrentUser.mockResolvedValue({
      app_metadata: {},
      user_metadata: { role: 'Admin' },
    });
    expect(await isPlatformAdmin()).toBe(false);
  });

  it('refuse un visiteur non connecté', async () => {
    server.getCurrentUser.mockResolvedValue(null);
    expect(await isPlatformAdmin()).toBe(false);
  });
});

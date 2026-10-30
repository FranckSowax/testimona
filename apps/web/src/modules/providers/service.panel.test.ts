import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo } = vi.hoisted(() => ({ repo: { listPanelProviders: vi.fn() } }));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/auth/platform-admin', () => ({ isPlatformAdmin: vi.fn() }));

const { providersForPanel } = await import('./service');

const example = {
  id: '66666666-6666-4666-8666-666666666666',
  categoryKey: 'sound',
  name: 'Sono Owendo (exemple)',
  city: 'Libreville',
  district: 'Owendo',
  priceNote: null,
  isExample: true,
  verifiedAt: null,
  active: true,
};

beforeEach(() => repo.listPanelProviders.mockReset());

describe('providersForPanel', () => {
  it('regroupe les prestataires de la ville, sans contrôle administrateur', async () => {
    repo.listPanelProviders.mockResolvedValue({ data: [example], error: null });
    const res = await providersForPanel(['tentsChairs', 'sound'], 'Libreville');
    expect(repo.listPanelProviders).toHaveBeenCalledWith(['tentsChairs', 'sound']);
    expect(res).toEqual({ ok: true, data: [{ category: 'sound', providers: [example] }] });
  });

  it('traduit une erreur de la base', async () => {
    repo.listPanelProviders.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect(await providersForPanel(['sound'], 'Libreville')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });
});

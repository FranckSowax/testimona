import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: séparé de service.test.ts (limite de 300 lignes) ; mêmes doublures.
const { repo, gate, answersRepo, dossierRepo } = vi.hoisted(() => ({
  repo: {
    listLines: vi.fn(),
    insertGridRows: vi.fn(),
    updateRecomputed: vi.fn(),
    insertLine: vi.fn(),
    updateLine: vi.fn(),
    deleteLine: vi.fn(),
    setScenario: vi.fn(),
  },
  gate: { budgetGate: vi.fn() },
  answersRepo: { listAnswersResult: vi.fn() },
  dossierRepo: { getMyRole: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('@/modules/dossier/repo', () => dossierRepo);
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => `label:${key}`),
}));

const { addLine, chooseScenario, createGridLines, deleteLine, recomputeLines, saveLine } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const amounts = { sober: '1000', intermediate: '2000', full: '3000' };
const WRITES = [
  repo.insertGridRows,
  repo.updateRecomputed,
  repo.insertLine,
  repo.updateLine,
  repo.deleteLine,
  repo.setScenario,
];

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  answersRepo.listAnswersResult.mockResolvedValue({
    data: { 'attendance.close': 10 },
    error: null,
  });
  repo.listLines.mockResolvedValue({ data: [], error: null });
  for (const fn of WRITES) fn.mockResolvedValue({ data: true, error: null });
});

const calls = () => [
  createGridLines({ dossierId: DOSSIER }, 'fr'),
  recomputeLines({ dossierId: DOSSIER }),
  saveLine({ dossierId: DOSSIER, lineId: LINE, label: 'X', ...amounts }),
  addLine({ dossierId: DOSSIER, label: 'X', ...amounts }),
  deleteLine({ dossierId: DOSSIER, lineId: LINE }),
  chooseScenario({ dossierId: DOSSIER, scenario: 'full' }),
];

describe('rôle', () => {
  it.each(['contributor', 'viewer', null])('refuse le rôle %s sans écrire', async (role) => {
    dossierRepo.getMyRole.mockResolvedValue(role);
    for (const res of await Promise.all(calls())) {
      expect(res).toEqual({ ok: false, error: 'forbidden' });
    }
    for (const fn of WRITES) expect(fn).not.toHaveBeenCalled();
    expect(dossierRepo.getMyRole).toHaveBeenCalledWith(DOSSIER);
  });

  it('accepte le trésorier et au-delà', async () => {
    for (const role of ['treasurer', 'coordinator', 'owner']) {
      dossierRepo.getMyRole.mockResolvedValue(role);
      for (const res of await Promise.all(calls())) expect(res).toMatchObject({ ok: true });
    }
  });

  it('ne lit pas le rôle d’un dossier hors budget', async () => {
    gate.budgetGate.mockResolvedValue('not_found');
    expect(await deleteLine({ dossierId: DOSSIER, lineId: LINE })).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(dossierRepo.getMyRole).not.toHaveBeenCalled();
  });
});

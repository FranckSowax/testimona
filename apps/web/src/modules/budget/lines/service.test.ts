import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, gate, answersRepo } = vi.hoisted(() => ({
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
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('../gate', () => gate);
vi.mock('@/modules/dossier/answers/repo', () => answersRepo);
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => `label:${key}`),
}));

const { addLine, chooseScenario, createGridLines, deleteLine, recomputeLines, saveLine } =
  await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const answers = { 'attendance.close': 10, 'attendance.nights': 1 };
const amounts = { sober: '1000', intermediate: '2000', full: '3000' };

beforeEach(() => {
  vi.clearAllMocks();
  gate.budgetGate.mockResolvedValue(null);
  answersRepo.listAnswersResult.mockResolvedValue({ data: answers, error: null });
  repo.listLines.mockResolvedValue({ data: [], error: null });
  for (const fn of [
    repo.insertGridRows,
    repo.updateRecomputed,
    repo.insertLine,
    repo.updateLine,
    repo.deleteLine,
    repo.setScenario,
  ]) {
    fn.mockResolvedValue({ data: true, error: null });
  }
});

describe('createGridLines', () => {
  it('crée les postes de la grille avec les libellés de la langue', async () => {
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toEqual({ ok: true, data: true });
    const [dossierId, rows] = repo.insertGridRows.mock.calls[0]!;
    expect(dossierId).toBe(DOSSIER);
    expect(rows[0]).toMatchObject({ gridKey: 'mortuary', label: 'label:mortuary', position: 0 });
  });

  it('refuse un dossier hors budget et une lecture des réponses en échec', async () => {
    gate.budgetGate.mockResolvedValueOnce('not_found');
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toMatchObject({
      error: 'not_found',
    });
    answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: { code: 'x' } });
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toMatchObject({
      error: 'unknown',
    });
    expect(repo.insertGridRows).not.toHaveBeenCalled();
  });

  it('refuse de créer les postes tant que l’affluence n’est pas renseignée', async () => {
    answersRepo.listAnswersResult.mockResolvedValueOnce({
      data: { 'attendance.nights': 2 },
      error: null,
    });
    expect(await createGridLines({ dossierId: DOSSIER }, 'fr')).toEqual({
      ok: false,
      error: 'no_attendance',
    });
    expect(repo.insertGridRows).not.toHaveBeenCalled();
  });
});

describe('recomputeLines', () => {
  it('ne met à jour que les postes non modifiés de la grille', async () => {
    repo.listLines.mockResolvedValueOnce({
      data: [
        {
          id: 'a',
          gridKey: 'coffin',
          label: 'Cercueil',
          amounts: { sober: 1, intermediate: 1, full: 1 },
          edited: false,
          position: 1,
        },
        {
          id: 'b',
          gridKey: 'hearse',
          label: 'Corbillard',
          amounts: { sober: 1, intermediate: 1, full: 1 },
          edited: true,
          position: 2,
        },
      ],
      error: null,
    });
    await recomputeLines({ dossierId: DOSSIER });
    const [, rows] = repo.updateRecomputed.mock.calls[0]!;
    expect(rows.map((r: { id: string }) => r.id)).toEqual(['a']);
  });

  it('refuse de recalculer tant que l’affluence n’est pas renseignée', async () => {
    answersRepo.listAnswersResult.mockResolvedValueOnce({ data: {}, error: null });
    expect(await recomputeLines({ dossierId: DOSSIER })).toEqual({
      ok: false,
      error: 'no_attendance',
    });
    expect(repo.updateRecomputed).not.toHaveBeenCalled();
  });
});

describe('saveLine, addLine, deleteLine', () => {
  it('enregistre un poste modifié', async () => {
    await saveLine({ dossierId: DOSSIER, lineId: LINE, label: 'Cercueil', ...amounts });
    expect(repo.updateLine).toHaveBeenCalledWith(DOSSIER, LINE, {
      label: 'Cercueil',
      amounts: { sober: 1000, intermediate: 2000, full: 3000 },
    });
  });

  it('renvoie les erreurs de champ sans écrire', async () => {
    const res = await addLine({ dossierId: DOSSIER, label: '', ...amounts });
    expect(res).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { label: 'required' },
    });
    expect(repo.insertLine).not.toHaveBeenCalled();
  });

  it('ajoute un poste libre après le dernier', async () => {
    repo.listLines.mockResolvedValueOnce({
      data: [
        {
          id: 'a',
          gridKey: null,
          label: 'A',
          amounts: { sober: 0, intermediate: 0, full: 0 },
          edited: true,
          position: 7,
        },
      ],
      error: null,
    });
    await addLine({ dossierId: DOSSIER, label: 'Fleurs', ...amounts });
    expect(repo.insertLine).toHaveBeenCalledWith(DOSSIER, {
      label: 'Fleurs',
      amounts: { sober: 1000, intermediate: 2000, full: 3000 },
      position: 8,
    });
  });

  it('traduit un poste qui porte des dépenses et un poste introuvable', async () => {
    repo.deleteLine.mockResolvedValueOnce({ data: null, error: { code: '23503', message: 'x' } });
    expect(await deleteLine({ dossierId: DOSSIER, lineId: LINE })).toMatchObject({
      error: 'line_in_use',
    });
    repo.updateLine.mockResolvedValueOnce({ data: null, error: { code: 'no_rows', message: 'x' } });
    expect(
      await saveLine({ dossierId: DOSSIER, lineId: LINE, label: 'X', ...amounts }),
    ).toMatchObject({ error: 'not_found' });
    repo.insertLine.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'x' } });
    expect(await addLine({ dossierId: DOSSIER, label: 'X', ...amounts })).toMatchObject({
      error: 'forbidden',
    });
  });
});

describe('chooseScenario', () => {
  it('retient un scénario ou l’efface', async () => {
    await chooseScenario({ dossierId: DOSSIER, scenario: 'intermediate' });
    expect(repo.setScenario).toHaveBeenLastCalledWith(DOSSIER, 'intermediate');
    await chooseScenario({ dossierId: DOSSIER, scenario: '' });
    expect(repo.setScenario).toHaveBeenLastCalledWith(DOSSIER, null);
  });
});

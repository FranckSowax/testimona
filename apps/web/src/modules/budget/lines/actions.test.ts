import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth, cache } = vi.hoisted(() => ({
  service: {
    createGridLines: vi.fn(),
    recomputeLines: vi.fn(),
    saveLine: vi.fn(),
    addLine: vi.fn(),
    deleteLine: vi.fn(),
    chooseScenario: vi.fn(),
  },
  auth: { getCurrentUser: vi.fn() },
  cache: { revalidatePath: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('next/cache', () => cache);
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'en') }));

const {
  addLineAction,
  chooseScenarioAction,
  createLinesAction,
  deleteLineAction,
  recomputeLinesAction,
  saveLineAction,
} = await import('./actions');
const { localizedPath } = await import('@/lib/auth/redirect-target');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const LINE = '55555555-5555-4555-8555-555555555555';
const USER = '66666666-6666-4666-8666-666666666666';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const lineForm = () =>
  form({
    dossierId: DOSSIER,
    lineId: LINE,
    label: 'Cercueil',
    sober: '1000',
    intermediate: '2000',
    full: '3000',
  });

const actions = [
  createLinesAction,
  recomputeLinesAction,
  saveLineAction,
  addLineAction,
  deleteLineAction,
  chooseScenarioAction,
];

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: USER });
  for (const fn of Object.values(service)) fn.mockResolvedValue({ ok: true, data: true });
});

describe('actions des postes', () => {
  it('refusent un visiteur non connecté sans appeler le service', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    for (const action of actions) {
      expect(await action(null, lineForm())).toEqual({ error: 'unauthenticated' });
    }
    for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it('revalident les trois pages localisées après succès', async () => {
    expect(await saveLineAction(null, lineForm())).toEqual({ ok: true });
    for (const path of [
      `/dossier/${DOSSIER}/cotisations/postes`,
      `/dossier/${DOSSIER}/cotisations`,
      `/dossier/${DOSSIER}`,
    ]) {
      expect(cache.revalidatePath).toHaveBeenCalledWith(localizedPath(path, 'en'));
    }
    expect(cache.revalidatePath).toHaveBeenCalledTimes(3);
  });

  it('rendent l’erreur du service sans revalider', async () => {
    service.addLine.mockResolvedValueOnce({
      ok: false,
      error: 'validation',
      fieldErrors: { label: 'required' },
    });
    expect(await addLineAction(null, lineForm())).toEqual({
      error: 'validation',
      fieldErrors: { label: 'required' },
    });
    service.recomputeLines.mockResolvedValueOnce({ ok: false, error: 'no_attendance' });
    expect(await recomputeLinesAction(null, lineForm())).toEqual({
      error: 'no_attendance',
      fieldErrors: undefined,
    });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it('createLinesAction transmet la langue de la session', async () => {
    await createLinesAction(null, lineForm());
    expect(service.createGridLines).toHaveBeenCalledWith({ dossierId: DOSSIER }, 'en');
  });

  it('transmettent la saisie au service', async () => {
    await saveLineAction(null, lineForm());
    expect(service.saveLine).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      lineId: LINE,
      label: 'Cercueil',
      sober: '1000',
      intermediate: '2000',
      full: '3000',
    });
    await deleteLineAction(null, lineForm());
    expect(service.deleteLine).toHaveBeenCalledWith({ dossierId: DOSSIER, lineId: LINE });
    await chooseScenarioAction(null, form({ dossierId: DOSSIER, scenario: 'intermediate' }));
    expect(service.chooseScenario).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      scenario: 'intermediate',
    });
  });
});

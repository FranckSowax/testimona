import { beforeEach, describe, expect, it, vi } from 'vitest';

const { service, auth, cache } = vi.hoisted(() => ({
  service: {
    recordPledge: vi.fn(),
    recordReceipt: vi.fn(),
    recordExpense: vi.fn(),
    reverseEntry: vi.fn(),
    setVisibility: vi.fn(),
  },
  auth: { getCurrentUser: vi.fn() },
  cache: { revalidatePath: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./service', () => service);
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('next/cache', () => cache);
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'en') }));

const { reverseEntryAction, saveEntryAction, setVisibilityAction } = await import('./actions');
const { localizedPath } = await import('@/lib/auth/redirect-target');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const USER = '66666666-6666-4666-8666-666666666666';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const entry = (kind: string) =>
  form({ dossierId: DOSSIER, idempotencyKey: 'k', partyName: 'Awa', amount: '5000', kind });

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: USER });
  for (const fn of Object.values(service)) fn.mockResolvedValue({ ok: true, data: { id: 'e1' } });
});

describe('saveEntryAction', () => {
  it('refuse une annulation ou un type inconnu sans appeler le service', async () => {
    for (const kind of ['reversal', 'other', '']) {
      expect(await saveEntryAction(null, entry(kind))).toEqual({ error: 'validation' });
    }
    for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it('refuse un visiteur non connecté', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    expect(await saveEntryAction(null, entry('pledge'))).toEqual({ error: 'unauthenticated' });
    expect(service.recordPledge).not.toHaveBeenCalled();
  });

  it('enregistre une promesse au nom de l’utilisateur de la session', async () => {
    const data = entry('pledge');
    data.set('memberId', 'forged');
    expect(await saveEntryAction(null, data)).toEqual({ ok: true });
    expect(service.recordPledge).toHaveBeenCalledWith(
      expect.objectContaining({ dossierId: DOSSIER, amount: '5000' }),
      USER,
    );
  });

  it('transmet le poste choisi pour une dépense', async () => {
    const data = entry('expense');
    data.set('method', 'cash');
    data.set('budgetLineId', 'line-1');
    await saveEntryAction(null, data);
    expect(service.recordExpense).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'cash', budgetLineId: 'line-1' }),
    );
    await saveEntryAction(null, entry('expense'));
    expect(service.recordExpense).toHaveBeenLastCalledWith(
      expect.objectContaining({ budgetLineId: '' }),
    );
  });

  it('revalide la page Cotisations et le tableau de bord après succès', async () => {
    await saveEntryAction(null, entry('expense'));
    expect(cache.revalidatePath).toHaveBeenCalledWith(
      localizedPath(`/dossier/${DOSSIER}/cotisations`, 'en'),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith(
      localizedPath(`/dossier/${DOSSIER}/cotisations/postes`, 'en'),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith(localizedPath(`/dossier/${DOSSIER}`, 'en'));
  });

  it('rend l’erreur du service sans revalider', async () => {
    service.recordReceipt.mockResolvedValueOnce({
      ok: false,
      error: 'validation',
      fieldErrors: { amount: 'out of range' },
    });
    expect(await saveEntryAction(null, entry('receipt'))).toEqual({
      error: 'validation',
      fieldErrors: { amount: 'out of range' },
    });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('reverseEntryAction et setVisibilityAction', () => {
  it('refusent un visiteur non connecté', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    expect(await reverseEntryAction(null, form({ dossierId: DOSSIER }))).toEqual({
      error: 'unauthenticated',
    });
    expect(await setVisibilityAction(null, form({ dossierId: DOSSIER }))).toEqual({
      error: 'unauthenticated',
    });
    expect(service.reverseEntry).not.toHaveBeenCalled();
    expect(service.setVisibility).not.toHaveBeenCalled();
  });

  it('transmettent la saisie au service', async () => {
    await reverseEntryAction(null, form({ dossierId: DOSSIER, idempotencyKey: 'k', entryId: 'e' }));
    expect(service.reverseEntry).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      idempotencyKey: 'k',
      entryId: 'e',
    });
    await setVisibilityAction(null, form({ dossierId: DOSSIER, visibility: 'members' }));
    expect(service.setVisibility).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      visibility: 'members',
    });
  });
});

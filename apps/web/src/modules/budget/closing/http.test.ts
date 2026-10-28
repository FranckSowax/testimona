import { createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import fr from '../../../../messages/fr.json';

const { auth, service } = vi.hoisted(() => ({
  auth: { getCurrentUser: vi.fn() },
  service: { exportLedger: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => auth);
vi.mock('./service', () => service);
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: 'fr' | 'en'; namespace: string }) =>
    createTranslator({
      locale,
      messages: locale === 'en' ? en : fr,
      namespace: namespace as never,
    }),
}));

const { ledgerExportResponse } = await import('./http');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const row = {
  id: 'e1',
  kind: 'receipt',
  amount: 10_000,
  method: 'airtel_money',
  partyName: 'Oncle Paul',
  budgetLineId: null,
  note: '',
  occurredOn: '2026-10-20',
  reversesId: null,
  pledgeId: null,
  createdAt: '2026-10-20T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ id: 'u1' });
  service.exportLedger.mockResolvedValue({
    ok: true,
    data: { rows: [row], lineLabels: new Map() },
  });
});

describe('ledgerExportResponse', () => {
  it('exige une session', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    const res = await ledgerExportResponse(DOSSIER, 'fr');
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(service.exportLedger).not.toHaveBeenCalled();
  });

  it.each([
    ['not_found', 404],
    ['forbidden', 404],
    ['validation', 404],
    ['unauthenticated', 401],
    ['too_large', 413],
    ['unknown', 502],
  ])('répond à %s par %i', async (error, status) => {
    service.exportLedger.mockResolvedValueOnce({ ok: false, error });
    const res = await ledgerExportResponse(DOSSIER, 'fr');
    expect(res.status).toBe(status);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('renvoie le CSV en pièce jointe, avec les libellés français par défaut', async () => {
    const res = await ledgerExportResponse(DOSSIER, null);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="registre-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const body = await res.text();
    expect(body).toContain('"Date";"Type";"Montant (FCFA)"');
    expect(body).toContain('"Cotisation reçue";"10000";"Airtel Money";"Oncle Paul"');
    expect(service.exportLedger).toHaveBeenCalledWith({ dossierId: DOSSIER });
  });

  it('suit la langue demandée et ignore une langue inconnue', async () => {
    const english = await ledgerExportResponse(DOSSIER, 'en');
    expect(english.headers.get('Content-Disposition')).toMatch(/filename="ledger-/);
    expect(await english.text()).toContain('"Contribution received"');
    const unknown = await ledgerExportResponse(DOSSIER, 'de');
    expect(unknown.headers.get('Content-Disposition')).toMatch(/filename="registre-/);
  });
});

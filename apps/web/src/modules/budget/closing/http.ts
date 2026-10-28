import 'server-only';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { ENTRY_KINDS, ENTRY_METHODS, ledgerToday } from '../ledger/schema';
import { CSV_COLUMNS, ledgerCsv, type CsvLabels } from './csv';
import { ExportLangSchema } from './schema';
import { exportLedger, type ClosingError } from './service';

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

// WHY: absent, interdit et invalide donnent 404, pour ne pas révéler l'existence d'un dossier.
const STATUS: Record<ClosingError, number> = {
  validation: 404,
  forbidden: 404,
  not_found: 404,
  unauthenticated: 401,
  too_large: 413,
  unknown: 502,
};

/**
 * Réponse de « Télécharger le registre (CSV) » : session exigée, trésorier et plus.
 * WHY: le fichier est produit à la demande avec le client de l'utilisateur (RLS), jamais
 * service-role, et n'est jamais mis en cache.
 *
 * @example
 * export async function GET(req, { params }) {
 *   return ledgerExportResponse((await params).dossierId, new URL(req.url).searchParams.get('lang'));
 * }
 */
export async function ledgerExportResponse(
  dossierId: string,
  lang: string | null,
): Promise<Response> {
  try {
    return await exportResponse(dossierId, lang);
  } catch (error) {
    // WHY: seul le nom de l'erreur est journalisé : jamais de montant ni de nom du registre.
    console.error('[budget/closing] ledger export failed', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    return new Response(null, { status: 500, headers: NO_STORE });
  }
}

async function exportResponse(dossierId: string, lang: string | null): Promise<Response> {
  if (!(await getCurrentUser())) return new Response(null, { status: 401, headers: NO_STORE });
  const res = await exportLedger({ dossierId });
  if (!res.ok) return new Response(null, { status: STATUS[res.error], headers: NO_STORE });

  const locale = ExportLangSchema.parse(lang ?? undefined);
  const [t, tKind, tMethod] = await Promise.all([
    getTranslations({ locale, namespace: 'closing.export' }),
    getTranslations({ locale, namespace: 'ledger.kind' }),
    getTranslations({ locale, namespace: 'ledger.method' }),
  ]);
  const labels: CsvLabels = {
    columns: Object.fromEntries(
      CSV_COLUMNS.map((column) => [column, t(`columns.${column}`)]),
    ) as CsvLabels['columns'],
    kind: Object.fromEntries(ENTRY_KINDS.map((k) => [k, tKind(k)])) as CsvLabels['kind'],
    method: Object.fromEntries(ENTRY_METHODS.map((m) => [m, tMethod(m)])) as CsvLabels['method'],
  };
  return new Response(ledgerCsv(res.data.rows, res.data.lineLabels, labels), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${t('fileName')}-${ledgerToday()}.csv"`,
      ...NO_STORE,
    },
  });
}

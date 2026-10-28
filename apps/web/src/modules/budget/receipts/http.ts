import 'server-only';
import { getCurrentUser } from '@/lib/supabase/server';
import { openReceipt } from './service';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Réponse de « Voir le reçu » : redirection vers un lien signé de 5 minutes créé à la demande.
 * WHY: un lien signé posé dans la page expirerait avant d'être ouvert ; la route en crée un neuf
 * à chaque clic. Absent ou interdit donnent 404, pour ne pas révéler l'existence d'un reçu.
 *
 * @example
 * export async function GET(_req, { params }) { return receiptRedirect((await params).receiptId); }
 */
export async function receiptRedirect(receiptId: string): Promise<Response> {
  if (!(await getCurrentUser())) return new Response(null, { status: 401, headers: NO_STORE });
  const res = await openReceipt({ receiptId });
  if (!res.ok) {
    const status =
      res.error === 'unauthenticated'
        ? 401
        : res.error === 'not_found' || res.error === 'forbidden'
          ? 404
          : 502;
    return new Response(null, { status, headers: NO_STORE });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: res.data, 'Referrer-Policy': 'no-referrer', ...NO_STORE },
  });
}

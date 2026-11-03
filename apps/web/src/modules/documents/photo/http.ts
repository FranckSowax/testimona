import 'server-only';
import { getCurrentUser } from '@/lib/supabase/server';
import { openCurrentPhoto } from './service';

// WHY: posés sur chaque réponse, redirection comprise : rien n'est mis en cache, le type n'est
// jamais deviné, et le lien signé ne fuit pas par le référent.
const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/**
 * Vignette de la photo du dossier : redirection vers un lien signé de 5 minutes créé à la demande.
 * WHY: comme `receiptRedirect`, un lien signé posé dans la page expirerait ; absence de photo et
 * absence de droit donnent toutes deux 404, pour ne rien révéler.
 *
 * @example
 * export async function GET(_req, { params }) { return photoRedirect((await params).dossierId); }
 */
export async function photoRedirect(dossierId: string): Promise<Response> {
  if (!(await getCurrentUser())) return new Response(null, { status: 401, headers: HEADERS });
  const res = await openCurrentPhoto(dossierId);
  if (!res.ok) {
    // WHY: les autres erreurs (validation, inconnue, stockage) sont internes : 500.
    const status =
      res.error === 'unauthenticated'
        ? 401
        : res.error === 'not_found' || res.error === 'forbidden'
          ? 404
          : 500;
    return new Response(null, { status, headers: HEADERS });
  }
  return new Response(null, { status: 303, headers: { Location: res.data, ...HEADERS } });
}

import { photoRedirect } from '@/modules/documents/photo/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Vignette de la photo du dossier : session exigée, lien signé de 5 minutes. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dossierId: string }> },
) {
  const { dossierId } = await params;
  return photoRedirect(dossierId);
}

import { documentResponse } from '@/modules/documents/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Livret (PDF), affiche (PDF) ou affiche carrée (PNG) : session exigée, tout membre du dossier. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string; doc: string }> },
) {
  const { dossierId, doc } = await params;
  return documentResponse(dossierId, doc, new URL(request.url).searchParams.get('lang'));
}

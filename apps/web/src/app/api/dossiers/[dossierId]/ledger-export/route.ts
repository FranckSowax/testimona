import { ledgerExportResponse } from '@/modules/budget/closing/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Export CSV du registre : session exigée, trésorier et plus. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> },
) {
  const { dossierId } = await params;
  return ledgerExportResponse(dossierId, new URL(request.url).searchParams.get('lang'));
}

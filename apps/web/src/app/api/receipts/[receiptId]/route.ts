import { receiptRedirect } from '@/modules/budget/receipts/http';

export const dynamic = 'force-dynamic';

/** « Voir le reçu » : session exigée, lien signé de 5 minutes. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { receiptId } = await params;
  return receiptRedirect(receiptId);
}

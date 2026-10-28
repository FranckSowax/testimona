'use server';

import { getCurrentUser } from '@/lib/supabase/server';
import * as service from './service';
import type { PreparedUpload, ReadResult, ReceiptsResult } from './service';

// WHY: un appel d'action peut porter n'importe quelle valeur ; on n'étale qu'un objet, et
// jamais de second argument (le fournisseur injectable sert aux tests).
const fieldsOf = (input: unknown) => (typeof input === 'object' && input !== null ? input : {});

/** Prépare l'envoi d'une photo de reçu (trésorier et plus). */
export async function prepareReceiptUploadAction(input: {
  dossierId: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<ReceiptsResult<PreparedUpload>> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  return service.prepareReceiptUpload({ ...fieldsOf(input) });
}

/** Lit un reçu envoyé pour préremplir la dépense ; rien n'est enregistré. */
export async function readReceiptAction(input: {
  dossierId: string;
  receiptId: string;
}): Promise<ReadResult> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  return service.readReceiptPrefill({ ...fieldsOf(input) });
}

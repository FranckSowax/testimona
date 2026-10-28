import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import { RECEIPT_BUCKET, type ReceiptType } from './schema';

/** Durée de vie d'un lien de lecture signé, en secondes (5 minutes). */
export const READ_URL_TTL_SECONDS = 300;

/** Reçu tel que lu en base. */
export interface Receipt {
  id: string;
  dossierId: string;
  entryId: string | null;
  storagePath: string;
  mimeType: ReceiptType;
  sizeBytes: number;
}

const COLUMNS = 'id, dossier_id, entry_id, storage_path, mime_type, size_bytes';

interface ReceiptRow {
  id: string;
  dossier_id: string;
  entry_id: string | null;
  storage_path: string;
  mime_type: ReceiptType;
  size_bytes: number;
}

const toReceipt = (r: ReceiptRow): Receipt => ({
  id: r.id,
  dossierId: r.dossier_id,
  entryId: r.entry_id,
  storagePath: r.storage_path,
  mimeType: r.mime_type,
  sizeBytes: r.size_bytes,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'receipts error' },
  };
}

// WHY: les erreurs du stockage n'ont pas de code Postgres ; « storage » les distingue.
const storageFail = (error: { message?: string }) => ({
  data: null,
  error: { code: 'storage', message: error.message || 'storage error' },
});

const NO_ROWS = { data: null, error: { code: 'no_rows', message: 'no row matched' } };

/**
 * Prépare un reçu non rattaché (trésorier et plus, vérifié par la base).
 * WHY: chemin, auteur, date et rattachement sont imposés par le trigger ; on n'envoie que le reste.
 */
export async function insertReceipt(
  dossierId: string,
  mimeType: ReceiptType,
  sizeBytes: number,
): Promise<RepoResult<Receipt>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('receipt')
    .insert({ dossier_id: dossierId, mime_type: mimeType, size_bytes: sizeBytes })
    .select(COLUMNS)
    .single<ReceiptRow>();
  if (error) return fail(error);
  return { data: toReceipt(data), error: null };
}

/** Reçu visible de l'utilisateur (RLS), ou null. */
export async function getReceipt(receiptId: string): Promise<RepoResult<Receipt | null>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('receipt')
    .select(COLUMNS)
    .eq('id', receiptId)
    .maybeSingle<ReceiptRow>();
  if (error) {
    console.error('[budget/receipts] getReceipt impossible', { code: error.code });
    return fail(error);
  }
  return { data: data ? toReceipt(data) : null, error: null };
}

/** Rattache un reçu à une dépense (trésorier et plus ; la base vérifie dépense et dossier). */
export async function attachReceipt(
  dossierId: string,
  receiptId: string,
  entryId: string,
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('receipt')
    .update({ entry_id: entryId })
    .eq('dossier_id', dossierId)
    .eq('id', receiptId)
    .select('id')
    .returns<{ id: string }[]>();
  if (error) return fail(error);
  // WHY: la RLS fait échouer en silence une mise à jour interdite (0 ligne) : on le signale.
  if (!data || data.length === 0) return NO_ROWS;
  return { data: true, error: null };
}

/** Reçus rattachés du dossier visibles de l'utilisateur, par dépense. */
export async function listReceiptsByEntry(
  dossierId: string,
): Promise<RepoResult<Map<string, string>>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('receipt')
    .select('id, entry_id')
    .eq('dossier_id', dossierId)
    .not('entry_id', 'is', null)
    .returns<{ id: string; entry_id: string }[]>();
  if (error) {
    console.error('[budget/receipts] listReceiptsByEntry impossible', { code: error.code });
    return fail(error);
  }
  return { data: new Map((data ?? []).map((r) => [r.entry_id, r.id])), error: null };
}

/**
 * Lien d'envoi signé pour le chemin d'un reçu préparé (policy d'insertion du bucket).
 * WHY: Supabase fixe sa durée (2 heures) ; il ne sert qu'une fois, le bucket refusant tout
 * remplacement.
 */
export async function createUploadUrl(
  path: string,
): Promise<RepoResult<{ path: string; token: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage.from(RECEIPT_BUCKET).createSignedUploadUrl(path);
  if (error) return storageFail(error);
  return { data: { path: data.path, token: data.token }, error: null };
}

/** Octets de la photo d'un reçu visible de l'utilisateur. */
export async function downloadReceipt(path: string): Promise<RepoResult<Uint8Array>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage.from(RECEIPT_BUCKET).download(path);
  if (error) return storageFail(error);
  return { data: new Uint8Array(await data.arrayBuffer()), error: null };
}

/** Lien de lecture signé de 5 minutes pour la photo d'un reçu visible de l'utilisateur. */
export async function signedReadUrl(path: string): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, READ_URL_TTL_SECONDS);
  if (error) return storageFail(error);
  return { data: data.signedUrl, error: null };
}

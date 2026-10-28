import 'server-only';
import { isAiEnabled } from '@/modules/ai/config';
import { readReceipt, type ReceiptReadError } from '@/modules/ai/receipt';
import type { ReceiptProvider } from '@/modules/ai/receipt-provider';
import { getMyRole } from '@/modules/dossier/repo';
import { hasRole } from '@/modules/dossier/roles';
import { budgetGate } from '../gate';
import { listLines } from '../lines/repo';
import * as repo from './repo';
import {
  PrepareReceiptSchema,
  RECEIPT_MAX_BYTES,
  ReceiptIdSchema,
  ReceiptRefSchema,
  sniffImageType,
  type ReceiptPrefill,
} from './schema';

export type ReceiptsError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'receipt_type'
  | 'receipt_size'
  | 'too_many_receipts'
  | 'unknown';

/**
 * Erreurs de la lecture : celles des reçus, plus celles de l'IA. Avec `unavailable`, `quota`,
 * `failed` et `too_large_to_read` (photo trop lourde pour l'IA), la photo reste jointe et la
 * saisie reste manuelle.
 */
export type ReadError = ReceiptsError | 'unavailable' | 'quota' | 'failed' | 'too_large_to_read';

export type ReceiptsResult<T> = { ok: true; data: T } | { ok: false; error: ReceiptsError };
export type ReadResult = { ok: true; data: ReceiptPrefill } | { ok: false; error: ReadError };

/** Envoi préparé : le navigateur envoie la photo au stockage avec ce chemin et ce jeton. */
export interface PreparedUpload {
  receiptId: string;
  path: string;
  token: string;
}

const CODES: Record<string, ReceiptsError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  // WHY: JWT expiré signalé par PostgREST.
  PGRST301: 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  // WHY: limite de 200 reçus par dossier (trigger de receipt).
  TL007: 'too_many_receipts',
  no_rows: 'not_found',
};

/**
 * Erreur de `readReceipt` vue par l'écran.
 * WHY: `too_large` vise la limite de l'IA (3,5 Mio), plus basse que celle de l'envoi (5 Mo) : la
 * photo reste jointe. `unsupported` ne devrait pas survenir (signature vérifiée avant) ; on le
 * traite comme une lecture en échec.
 */
function fromReading(error: ReceiptReadError): ReadError {
  if (error === 'too_large') return 'too_large_to_read';
  if (error === 'unsupported') return 'failed';
  return error;
}

function fromRepo(error: { code: string }, scope: string): { ok: false; error: ReceiptsError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/receipts] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

/**
 * Porte des reçus : dossier ouvert au budget, puis rôle trésorier ou plus.
 * WHY: la lecture consomme le quota d'IA (ouvert dès le contributeur) ; on la réserve à qui
 * saisit les dépenses. La RLS reste le garde-fou de la base.
 */
async function managerGate(dossierId: string): Promise<ReceiptsError | null> {
  const blocked = await budgetGate(dossierId);
  if (blocked) return blocked;
  return hasRole(await getMyRole(dossierId), 'treasurer') ? null : 'forbidden';
}

/**
 * Prépare l'envoi d'une photo de reçu : ligne `receipt` non rattachée et lien d'envoi signé.
 *
 * @example
 * await prepareReceiptUpload({ dossierId, mimeType: 'image/jpeg', sizeBytes: 812_000 });
 */
export async function prepareReceiptUpload(raw: unknown): Promise<ReceiptsResult<PreparedUpload>> {
  const input = PrepareReceiptSchema.safeParse(raw);
  if (!input.success) {
    const field = input.error.issues[0]?.path[0];
    const error =
      field === 'mimeType' ? 'receipt_type' : field === 'sizeBytes' ? 'receipt_size' : 'validation';
    return { ok: false, error };
  }
  const { dossierId, mimeType, sizeBytes } = input.data;
  const blocked = await managerGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  const receipt = await repo.insertReceipt(dossierId, mimeType, sizeBytes);
  if (receipt.error) return fromRepo(receipt.error, 'prepare');
  const upload = await repo.createUploadUrl(receipt.data.storagePath);
  if (upload.error) return fromRepo(upload.error, 'createUploadUrl');
  return {
    ok: true,
    data: { receiptId: receipt.data.id, path: upload.data.path, token: upload.data.token },
  };
}

/**
 * Lit un reçu envoyé et non rattaché pour préremplir la dépense (trésorier et plus).
 * Un échec de l'IA (`unavailable`, `quota`, `failed`) laisse la saisie manuelle possible.
 *
 * @example
 * const res = await readReceiptPrefill({ dossierId, receiptId });
 */
export async function readReceiptPrefill(
  raw: unknown,
  provider?: ReceiptProvider,
): Promise<ReadResult> {
  const input = ReceiptRefSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, receiptId } = input.data;
  const blocked = await managerGate(dossierId);
  if (blocked) return { ok: false, error: blocked };
  // WHY: sans clé, inutile de télécharger la photo : la saisie reste manuelle.
  if (!isAiEnabled()) return { ok: false, error: 'unavailable' };
  const receipt = await repo.getReceipt(receiptId);
  if (receipt.error) return fromRepo(receipt.error, 'getReceipt');
  if (!receipt.data || receipt.data.dossierId !== dossierId) {
    return { ok: false, error: 'not_found' };
  }
  // WHY: un reçu déjà joint a déjà servi ; le relire consommerait le quota pour rien.
  if (receipt.data.entryId) return { ok: false, error: 'validation' };

  // WHY: télécharger et lire les postes avant de consommer le quota : une lecture en échec ne
  // coûte pas d'appel.
  const [file, lines] = await Promise.all([
    repo.downloadReceipt(receipt.data.storagePath),
    listLines(dossierId),
  ]);
  if (file.error || lines.error) {
    console.error('[budget/receipts] read inputs unavailable', {
      file: file.error?.code ?? null,
      lines: lines.error?.code ?? null,
    });
    return { ok: false, error: 'failed' };
  }
  if (file.data.length > RECEIPT_MAX_BYTES) return { ok: false, error: 'receipt_size' };
  const mimeType = sniffImageType(file.data);
  if (!mimeType) return { ok: false, error: 'receipt_type' };

  const reading = await readReceipt({ dossierId, image: { bytes: file.data, mimeType } }, provider);
  if (!reading.ok) return { ok: false, error: fromReading(reading.error) };
  const { amount, date, vendor, gridKey } = reading.data;
  const line = gridKey ? lines.data.find((l) => l.gridKey === gridKey) : undefined;
  return {
    ok: true,
    data: { amount, occurredOn: date, partyName: vendor, budgetLineId: line?.id ?? null },
  };
}

/**
 * Lien de lecture signé (5 minutes) de la photo d'un reçu visible de l'utilisateur.
 * WHY: un identifiant invalide et un reçu invisible donnent tous deux `not_found`.
 */
export async function openReceipt(raw: unknown): Promise<ReceiptsResult<string>> {
  const input = ReceiptIdSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'not_found' };
  const receipt = await repo.getReceipt(input.data.receiptId);
  if (receipt.error) return fromRepo(receipt.error, 'openReceipt');
  if (!receipt.data) return { ok: false, error: 'not_found' };
  const url = await repo.signedReadUrl(receipt.data.storagePath);
  if (url.error) return fromRepo(url.error, 'signedReadUrl');
  return { ok: true, data: url.data };
}

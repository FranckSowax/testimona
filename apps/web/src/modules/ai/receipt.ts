import 'server-only';
import { z } from 'zod';
import { GRID_KEYS } from '@/modules/budget/grid';
import { AMOUNT_MAX } from '@/modules/budget/scenarios';
import { isAiEnabled } from './config';
import { AiProviderError } from './provider';
import { takeAiQuota } from './quota';
import {
  openRouterReceiptProvider,
  type ReceiptImage,
  type ReceiptProvider,
} from './receipt-provider';
import type { AiError } from './types';

/** Ce que l'IA a lu sur un reçu ; chaque champ vaut null quand il est absent ou invalide. */
export interface ReceiptReading {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  gridKey: string | null;
}

export type ReceiptReadResult = { ok: true; data: ReceiptReading } | { ok: false; error: AiError };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date AAAA-MM-JJ réelle, du 2000-01-01 à demain au plus (mêmes bornes que le registre). */
function isReceiptDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const date = new Date(`${s}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === s &&
    s >= '2000-01-01' &&
    date.getTime() <= Date.now() + DAY_MS
  );
}

/** Fournisseur sans caractère de contrôle, espaces resserrés, 120 caractères au plus. */
function cleanVendor(s: string): string | null {
  const text = [...s]
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? [...text].slice(0, 120).join('') : null;
}

// WHY: chaque champ invalide devient null au lieu de rejeter toute la lecture : le résultat
// n'est qu'un préremplissage que le trésorier vérifie.
const ReadingSchema = z.object({
  amount: z.number().int().min(1).max(AMOUNT_MAX).nullable().catch(null),
  date: z.string().refine(isReceiptDate).nullable().catch(null),
  vendor: z.string().transform(cleanVendor).nullable().catch(null),
  gridKey: z
    .string()
    .refine((key) => GRID_KEYS.includes(key))
    .nullable()
    .catch(null),
});

/**
 * Extrait et valide la lecture d'un reçu dans la réponse du modèle ; null si rien n'est lisible.
 *
 * @example
 * parseReceiptReading('{"amount": 45000, "date": null, "vendor": "Mba", "gridKey": "coffin"}');
 */
export function parseReceiptReading(text: string): ReceiptReading | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = ReadingSchema.safeParse(value);
  if (!parsed.success) return null;
  // WHY: une lecture sans aucun champ ne préremplit rien : on la traite comme un échec.
  return Object.values(parsed.data).every((v) => v === null) ? null : parsed.data;
}

/**
 * Lit la photo d'un reçu pour préremplir une dépense. Consomme le quota d'IA du dossier (même
 * quota que les brouillons), puis envoie seulement l'image. Ne journalise ni la réponse ni le
 * contenu du reçu. L'appelant vérifie le dossier, le rôle et l'image.
 *
 * @example
 * const res = await readReceipt({ dossierId, image: { bytes, mimeType: 'image/jpeg' } });
 */
export async function readReceipt(
  input: { dossierId: string; image: ReceiptImage },
  provider?: ReceiptProvider,
): Promise<ReceiptReadResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  // WHY: `apiKey` sert au typage (string) ; `isAiEnabled` reste la source de vérité du drapeau.
  if (!isAiEnabled() || !apiKey) return { ok: false, error: 'unavailable' };
  const quotaError = await takeAiQuota(input.dossierId);
  if (quotaError) return { ok: false, error: quotaError };
  let text: string;
  try {
    text = await (provider ?? openRouterReceiptProvider(apiKey))(input.image);
  } catch (error) {
    const reason = error instanceof AiProviderError ? error.reason : 'unknown';
    console.error('[ai] readReceipt failed', { reason });
    return { ok: false, error: 'failed' };
  }
  const reading = parseReceiptReading(text);
  if (!reading) {
    console.error('[ai] receipt reading rejected', { shape: 'invalid' });
    return { ok: false, error: 'failed' };
  }
  return { ok: true, data: reading };
}

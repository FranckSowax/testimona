import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Compute (Studia) credit system — the admin-facing pool that pays for
 * every video generation. End users buy Testimona credits and spend
 * those (1 credit = 1 video) ; behind the scenes the admin's Studia
 * balance is also debited the marked-up provider cost. When this pool
 * runs out, generations refuse to submit.
 */

/**
 * Studia compute credit = 1 video. Keeps the admin's balance directly
 * readable as "how many videos can I still serve". Each generation
 * deducts exactly 1 credit from this pool.
 */
export const STUDIA_COST_PER_VIDEO = 1;

/**
 * Top-up packs offered by Studia Labs to the Testimona admin.
 *
 * Underlying real cost: ~0.18€ per video on fal.ai (Seedance 2.0,
 * 5s, 720p). Studia markup ×2 → admin pays ~0.36€/video baseline.
 * Volume packs apply a rebate on top.
 *
 *   Starter:     50 vidéos =  19€   (0.38€/vidéo)
 *   Croissance: 200 vidéos =  69€   (0.345€/vidéo, −9%)
 *   Échelle:   1000 vidéos = 299€   (0.30€/vidéo,  −21%)
 */
export const STUDIA_PACKS = [
  { id: 'starter', credits: 50, priceCents: 1900, label: 'Starter' },
  { id: 'growth', credits: 200, priceCents: 6900, label: 'Croissance' },
  { id: 'scale', credits: 1000, priceCents: 29900, label: 'Échelle' },
] as const;

export type StudiaPackId = (typeof STUDIA_PACKS)[number]['id'];
export function findStudiaPack(id: string) {
  return STUDIA_PACKS.find((p) => p.id === id);
}

export interface StudiaTxRow {
  id: string;
  amount: number;
  type: 'topup' | 'spend' | 'refund' | 'adjust';
  memorialClipId: string | null;
  note: string | null;
  createdAt: string;
}

export async function getStudiaBalance(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('StudiaBalance')
    .select('balance')
    .eq('id', 1)
    .maybeSingle<{ balance: number }>();
  return Number(data?.balance ?? 0);
}

export async function getStudiaTransactions(
  limit = 40,
): Promise<StudiaTxRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('StudiaTransaction')
    .select('id, amount, type, memorialClipId, note, createdAt')
    .order('createdAt', { ascending: false })
    .limit(limit)
    .returns<StudiaTxRow[]>();
  return data ?? [];
}

interface AddOptions {
  type: StudiaTxRow['type'];
  memorialClipId?: string;
  note?: string;
}

async function addTransaction(
  amount: number,
  opts: AddOptions,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('StudiaTransaction').insert({
    amount,
    type: opts.type,
    memorialClipId: opts.memorialClipId ?? null,
    note: opts.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const balance = await getStudiaBalance();
  return { ok: true, balance };
}

export async function topUpStudia(
  credits: number,
  note?: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (credits <= 0) return { ok: false, error: 'amount must be positive' };
  return addTransaction(credits, {
    type: 'topup',
    note: note ?? 'Admin top-up',
  });
}

export async function spendStudia(
  credits: number,
  opts: { memorialClipId?: string; note?: string },
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (credits <= 0) return { ok: false, error: 'amount must be positive' };
  const balance = await getStudiaBalance();
  if (balance < credits) return { ok: false, error: 'Solde compute insuffisant.' };
  return addTransaction(-credits, {
    type: 'spend',
    memorialClipId: opts.memorialClipId,
    note: opts.note,
  });
}

export async function refundStudia(
  credits: number,
  opts: { memorialClipId?: string; note?: string },
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (credits <= 0) return { ok: false, error: 'amount must be positive' };
  return addTransaction(credits, {
    type: 'refund',
    memorialClipId: opts.memorialClipId,
    note: opts.note,
  });
}

import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Compute (Studia) credit system — the admin-facing pool that pays for
 * every video generation. End users buy Testimona credits and spend
 * those (1 credit = 1 video) ; behind the scenes the admin's Studia
 * balance is also debited the marked-up provider cost. When this pool
 * runs out, generations refuse to submit.
 */

/** Real provider cost per Seedance 5s @ 720p, in raw upstream credits. */
const REAL_COST_PER_VIDEO = 15;

/** Markup applied when reselling to the Testimona admin. */
const STUDIA_MARKUP = 2;

/** Final Studia-credit cost per generated video. */
export const STUDIA_COST_PER_VIDEO = REAL_COST_PER_VIDEO * STUDIA_MARKUP;

/** Top-up packs offered by Studia Labs to the Testimona admin. */
export const STUDIA_PACKS = [
  { id: 'starter', credits: 100, priceCents: 4500, label: 'Starter' },
  { id: 'growth', credits: 500, priceCents: 19000, label: 'Croissance' },
  { id: 'scale', credits: 2000, priceCents: 65000, label: 'Échelle' },
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

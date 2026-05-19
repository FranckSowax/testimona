import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface CreditTransactionRow {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'spend' | 'refund' | 'admin_grant' | 'demo_grant';
  stripePaymentId: string | null;
  memorialClipId: string | null;
  note: string | null;
  createdAt: string;
}

/**
 * End-user credit packs. Pricing follows the platform's additive markup
 * chain calibrated on the real fal.ai cost ($1.827 USD per Seedance 2
 * image-to-video):
 *
 *   real fal cost  +$0.25 Studia  +$0.25 admin  =  $2.327 ≈ €2.14/video
 *
 *   Découverte:  10 vidéos =  22€   (2.20€/vidéo)
 *   Standard:    30 vidéos =  64€   (2.13€/vidéo, légère remise)
 *   Pro:        100 vidéos = 209€   (2.09€/vidéo)
 *
 * Volume tiers shave a few cents while keeping admin margin positive.
 */
export const CREDIT_PACKS = [
  { id: 'starter', credits: 10, priceCents: 2200, label: 'Découverte' },
  { id: 'standard', credits: 30, priceCents: 6400, label: 'Standard' },
  { id: 'pro', credits: 100, priceCents: 20900, label: 'Pro' },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id'];

export function findPack(id: string) {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('UserCredit')
    .select('balance')
    .eq('userId', userId)
    .maybeSingle<{ balance: number }>();
  return data?.balance ?? 0;
}

export async function getRecentTransactions(
  userId: string,
  limit = 20,
): Promise<CreditTransactionRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('CreditTransaction')
    .select(
      'id, userId, amount, type, stripePaymentId, memorialClipId, note, createdAt',
    )
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(limit)
    .returns<CreditTransactionRow[]>();
  return data ?? [];
}

interface AddOptions {
  type: CreditTransactionRow['type'];
  stripePaymentId?: string;
  memorialClipId?: string;
  note?: string;
}

export async function addCredits(
  userId: string,
  amount: number,
  opts: AddOptions,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: 'amount must be positive' };
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('CreditTransaction').insert({
    userId,
    amount,
    type: opts.type,
    stripePaymentId: opts.stripePaymentId ?? null,
    memorialClipId: opts.memorialClipId ?? null,
    note: opts.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const balance = await getBalance(userId);
  return { ok: true, balance };
}

/**
 * Atomic-ish spend: reads the balance, refuses if short, then inserts a
 * negative transaction. The trigger keeps UserCredit.balance synced. There's
 * a tiny race window for concurrent spends; the CHECK constraint
 * (balance >= 0) on UserCredit will block double-spend at DB level by
 * raising — caller should handle the resulting error path.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  opts: { memorialClipId?: string; note?: string },
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: 'amount must be positive' };
  const current = await getBalance(userId);
  if (current < amount) return { ok: false, error: 'Solde insuffisant.' };
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('CreditTransaction').insert({
    userId,
    amount: -amount,
    type: 'spend',
    memorialClipId: opts.memorialClipId ?? null,
    note: opts.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, balance: current - amount };
}

export async function refundCredits(
  userId: string,
  amount: number,
  opts: { memorialClipId?: string; note?: string },
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  return addCredits(userId, amount, {
    type: 'refund',
    memorialClipId: opts.memorialClipId,
    note: opts.note,
  });
}

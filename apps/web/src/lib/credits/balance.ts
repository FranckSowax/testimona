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
 * End-user credit packs. Pricing follows the platform's 2× markup chain:
 *
 *   provider cost  ×2  →  admin (Studia)  ×2  →  end user
 *
 * With STUDIA_COST_PER_VIDEO = 30 and the admin's mid-tier pack costing
 * 0.38€ / Studia credit, 1 video costs the admin ~11.40€. Doubled for
 * the end user → 22.80€ per video. Bigger packs apply a volume rebate
 * but never drop below the admin breakeven.
 */
export const CREDIT_PACKS = [
  { id: 'starter', credits: 10, priceCents: 22900, label: 'Découverte' },
  { id: 'standard', credits: 30, priceCents: 59900, label: 'Standard' },
  { id: 'pro', credits: 100, priceCents: 179900, label: 'Pro' },
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

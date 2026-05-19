'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase/admin';
import {
  findStudiaPack,
  topUpStudia,
  refundStudia,
  spendStudia,
} from '@/lib/compute/balance';

export interface StudiaActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Demo top-up — instantly credits the admin's Studia balance with the
 * pack value. Real Stripe wiring lands when STRIPE_SECRET_KEY is set.
 */
export async function topUpStudiaAction(
  _prev: StudiaActionState | null,
  formData: FormData,
): Promise<StudiaActionState> {
  await requireAdmin();
  const packId = String(formData.get('packId') ?? '').trim();
  const pack = findStudiaPack(packId);
  if (!pack) return { error: 'Pack inconnu.' };

  const result = await topUpStudia(
    pack.credits,
    `Demo top-up: pack ${pack.label} (${pack.credits} crédits)`,
  );
  if (!result.ok) return { error: result.error };
  revalidatePath('/admin/credits');
  return { ok: true };
}

/**
 * Manual compute adjustment (positive = grant, negative = debit). Used
 * when an external incident requires fixing the balance by hand.
 */
export async function adjustStudiaAction(
  _prev: StudiaActionState | null,
  formData: FormData,
): Promise<StudiaActionState> {
  await requireAdmin();
  const amount = parseFloat(String(formData.get('amount') ?? '0'));
  const note = String(formData.get('note') ?? '').trim() || 'Admin adjustment';
  if (!Number.isFinite(amount) || amount === 0)
    return { error: 'Montant invalide.' };

  const result =
    amount > 0
      ? await refundStudia(amount, { note })
      : await spendStudia(-amount, { note });
  if (!result.ok) return { error: result.error };
  revalidatePath('/admin/credits');
  return { ok: true };
}

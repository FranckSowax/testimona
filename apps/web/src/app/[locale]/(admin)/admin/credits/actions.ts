'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, getSupabaseAdminClient } from '@/lib/supabase/admin';
import { addCredits } from '@/lib/credits/balance';

export interface AdminCreditActionState {
  ok?: boolean;
  error?: string;
}

export async function adminGrantCreditsAction(
  _prev: AdminCreditActionState | null,
  formData: FormData,
): Promise<AdminCreditActionState> {
  await requireAdmin();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const amount = parseInt(String(formData.get('amount') ?? '0'), 10);
  const note = String(formData.get('note') ?? '').trim() || 'Admin grant';
  if (!email) return { error: 'Email requis' };
  if (!Number.isFinite(amount) || amount === 0)
    return { error: 'Montant invalide (entier non nul)' };

  const supabase = getSupabaseAdminClient();
  const { data: users, error: ulErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (ulErr) return { error: ulErr.message };
  const target = users.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return { error: `Utilisateur ${email} introuvable` };

  if (amount > 0) {
    const r = await addCredits(target.id, amount, {
      type: 'admin_grant',
      note,
    });
    if (!r.ok) return { error: r.error };
  } else {
    // Negative grant — revoke. Insert directly so we can negate freely.
    const { error } = await supabase.from('CreditTransaction').insert({
      userId: target.id,
      amount,
      type: 'admin_grant',
      note,
    });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/credits');
  return { ok: true };
}

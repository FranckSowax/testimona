'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';
import { refundCredits } from '@/lib/credits/balance';

export interface AdminClipActionState {
  ok?: boolean;
  error?: string;
}

interface ClipForRefund {
  id: string;
  createdById: string;
  creditCost: number;
  status: string;
}

export async function adminForceFailClipAction(
  _prev: AdminClipActionState | null,
  formData: FormData,
): Promise<AdminClipActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis' };

  const supabase = getSupabaseAdminClient();
  const { data: clip } = await supabase
    .from('MemorialClip')
    .select('id, createdById, creditCost, status')
    .eq('id', id)
    .maybeSingle<ClipForRefund>();
  if (!clip) return { error: 'Clip introuvable' };
  if (clip.status === 'failed') return { ok: true };

  const { error } = await supabase
    .from('MemorialClip')
    .update({
      status: 'failed',
      errorMessage: 'Forced failed by admin',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  // Refund if it hadn't been refunded yet (status was not 'failed' before)
  await refundCredits(clip.createdById, clip.creditCost, {
    memorialClipId: clip.id,
    note: 'Admin forced fail + refund',
  });

  revalidatePath('/admin/clips');
  return { ok: true };
}

export async function adminDeleteClipAction(
  _prev: AdminClipActionState | null,
  formData: FormData,
): Promise<AdminClipActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis' };
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('MemorialClip').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/clips');
  return { ok: true };
}

export async function adminPollClipsAction(): Promise<AdminClipActionState> {
  await requireAdmin();
  // Just hit the same route so the logic stays in one place.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    await fetch(`${base}/api/clips/poll`, { method: 'POST' });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath('/admin/clips');
  return { ok: true };
}

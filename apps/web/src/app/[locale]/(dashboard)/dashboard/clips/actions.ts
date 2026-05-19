'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getBalance, spendCredits } from '@/lib/credits/balance';
import {
  STUDIA_COST_PER_VIDEO,
  getStudiaBalance,
  spendStudia,
} from '@/lib/compute/balance';
import { submitImageToVideo } from '@/lib/higgsfield/client';

export interface ClipActionState {
  ok?: boolean;
  error?: string;
  needsCredits?: number;
}

interface ClipRow {
  id: string;
  memorialId: string;
  memorialSlug: string;
  photoId: string;
  photoUrl: string;
  caption: string | null;
  captionSource: string | null;
  testimonialId: string | null;
  status: string;
  validatedAt: string | null;
  createdById: string;
}

async function loadOwnedClip(
  clipId: string,
  userId: string,
): Promise<ClipRow | { error: string }> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('MemorialClip')
    .select(
      `id, memorialId, photoId, caption, captionSource, testimonialId,
       status, validatedAt, createdById,
       Memorial:Memorial!MemorialClip_memorialId_fkey(slug),
       Photo:Photo!MemorialClip_photoId_fkey(url)`,
    )
    .eq('id', clipId)
    .maybeSingle<{
      id: string;
      memorialId: string;
      photoId: string;
      caption: string | null;
      captionSource: string | null;
      testimonialId: string | null;
      status: string;
      validatedAt: string | null;
      createdById: string;
      Memorial: { slug: string } | null;
      Photo: { url: string } | null;
    }>();
  if (!data) return { error: 'Clip introuvable.' };
  if (data.createdById !== userId)
    return { error: 'Action réservée au créateur.' };
  return {
    id: data.id,
    memorialId: data.memorialId,
    memorialSlug: data.Memorial?.slug ?? '',
    photoId: data.photoId,
    photoUrl: data.Photo?.url ?? '',
    caption: data.caption,
    captionSource: data.captionSource,
    testimonialId: data.testimonialId,
    status: data.status,
    validatedAt: data.validatedAt,
    createdById: data.createdById,
  };
}

/**
 * Marks a 'ready' clip as validated → makes it visible in the public story
 * player. Idempotent.
 */
export async function validateClipAction(
  _prev: ClipActionState | null,
  formData: FormData,
): Promise<ClipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const clip = await loadOwnedClip(id, user.id);
  if ('error' in clip) return clip;
  if (clip.status !== 'ready')
    return { error: 'Clip pas encore prêt.' };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('MemorialClip')
    .update({
      validatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clips');
  if (clip.memorialSlug)
    revalidatePath(`/memorial/${clip.memorialSlug}`);
  return { ok: true };
}

/**
 * Un-validate (hide from public player) without deleting the clip — owner
 * can re-validate later.
 */
export async function unvalidateClipAction(
  _prev: ClipActionState | null,
  formData: FormData,
): Promise<ClipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const clip = await loadOwnedClip(id, user.id);
  if ('error' in clip) return clip;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('MemorialClip')
    .update({
      validatedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clips');
  if (clip.memorialSlug)
    revalidatePath(`/memorial/${clip.memorialSlug}`);
  return { ok: true };
}

/**
 * Submit a new Higgsfield job with the same photo + caption (different seed
 * each time). Costs 1 credit and creates a new MemorialClip row. The old
 * clip is unchanged — the owner can keep, validate, or delete it.
 */
export async function regenerateClipAction(
  _prev: ClipActionState | null,
  formData: FormData,
): Promise<ClipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const clip = await loadOwnedClip(id, user.id);
  if ('error' in clip) return clip;

  const balance = await getBalance(user.id);
  if (balance < 1)
    return { error: 'Solde insuffisant.', needsCredits: 1 };

  // Same upfront compute check as the main animate flow.
  const computeBalance = await getStudiaBalance();
  if (computeBalance < STUDIA_COST_PER_VIDEO) {
    return {
      error:
        'Service indisponible momentanément. Réessaie dans quelques minutes — l\'admin a été notifié.',
    };
  }

  const supabase = getSupabaseAdminClient();
  const spend = await spendCredits(user.id, 1, {
    note: `Regen clip ${clip.id.slice(0, 8)}`,
  });
  if (!spend.ok) return { error: spend.error };

  const { data: newClip, error: insertErr } = await supabase
    .from('MemorialClip')
    .insert({
      memorialId: clip.memorialId,
      photoId: clip.photoId,
      caption: clip.caption,
      captionSource: clip.captionSource,
      testimonialId: clip.testimonialId,
      status: 'pending',
      createdById: user.id,
      creditCost: 1,
      providerCreditCost: STUDIA_COST_PER_VIDEO,
    })
    .select('id')
    .single<{ id: string }>();
  if (insertErr || !newClip) {
    await supabase.from('CreditTransaction').insert({
      userId: user.id,
      amount: 1,
      type: 'refund',
      note: 'Regénération échouée — remboursé',
    });
    return { error: insertErr?.message ?? 'Insert failed' };
  }

  const job = await submitImageToVideo({
    imageUrl: clip.photoUrl,
    prompt: clip.caption || 'Animate this portrait gracefully',
    durationSec: 6,
  });
  if ('error' in job) {
    await supabase
      .from('MemorialClip')
      .update({
        status: 'failed',
        errorMessage: job.error,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', newClip.id);
    await supabase.from('CreditTransaction').insert({
      userId: user.id,
      amount: 1,
      type: 'refund',
      memorialClipId: newClip.id,
      note: 'Regénération échouée — remboursé',
    });
    return { error: job.error };
  }

  await supabase
    .from('MemorialClip')
    .update({
      higgsfieldJobId: job.jobId,
      status: 'processing',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', newClip.id);

  // Debit the compute pool for the regen too.
  await spendStudia(STUDIA_COST_PER_VIDEO, {
    memorialClipId: newClip.id,
    note: 'Regen user',
  });

  revalidatePath('/dashboard/clips');
  revalidatePath('/dashboard/profile/credits');
  return { ok: true };
}

/** Owner deletes their own clip outright. */
export async function deleteOwnClipAction(
  _prev: ClipActionState | null,
  formData: FormData,
): Promise<ClipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const clip = await loadOwnedClip(id, user.id);
  if ('error' in clip) return clip;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('MemorialClip').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clips');
  if (clip.memorialSlug)
    revalidatePath(`/memorial/${clip.memorialSlug}`);
  return { ok: true };
}

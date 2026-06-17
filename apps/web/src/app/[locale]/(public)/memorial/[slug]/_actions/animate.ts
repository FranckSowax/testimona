'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { getBalance, spendCredits } from '@/lib/credits/balance';
import {
  STUDIA_COST_PER_VIDEO,
  getStudiaBalance,
  spendStudia,
} from '@/lib/compute/balance';
import { submitImageToVideo } from '@/lib/higgsfield/client';

export interface AnimateSelection {
  photoId: string;
  captionSource: 'testimonial' | 'free';
  testimonialId?: string;
  caption: string;
}

export interface AnimateActionResult {
  ok: boolean;
  error?: string;
  createdClipIds?: string[];
  needsCredits?: number;
}

const MAX_PER_REQUEST = 12;
const MAX_PROMPT_LEN = 280;

interface MemorialRow {
  id: string;
  ownerId: string;
  slug: string;
}

interface PhotoRow {
  id: string;
  url: string;
  memorialId: string;
}

/**
 * Validates ownership + funds, submits one Higgsfield job per photo,
 * deducts credits, returns the list of created clip ids. Caller polls
 * `/api/clips/poll` or watches via dashboard.
 */
export async function submitAnimationAction(
  memorialId: string,
  selections: AnimateSelection[],
): Promise<AnimateActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Non connecté.' };

  if (!Array.isArray(selections) || selections.length === 0)
    return { ok: false, error: 'Aucune photo sélectionnée.' };
  if (selections.length > MAX_PER_REQUEST)
    return {
      ok: false,
      error: `Maximum ${MAX_PER_REQUEST} photos par génération.`,
    };

  const supabase = getSupabaseAdminClient();
  const { data: memorial } = await supabase
    .from('Memorial')
    .select('id, ownerId, slug')
    .eq('id', memorialId)
    .maybeSingle<MemorialRow>();
  if (!memorial) return { ok: false, error: 'Mémorial introuvable.' };
  if (!(await canManageMemorial(memorialId, user.id)))
    return { ok: false, error: 'Réservé aux administrateurs du mémorial.' };

  // Validate and sanitize selections
  const photoIds = Array.from(new Set(selections.map((s) => s.photoId)));
  const { data: photos } = await supabase
    .from('Photo')
    .select('id, url, memorialId')
    .in('id', photoIds)
    .returns<PhotoRow[]>();
  const photosById = new Map((photos ?? []).map((p) => [p.id, p]));
  for (const sel of selections) {
    const p = photosById.get(sel.photoId);
    if (!p || p.memorialId !== memorialId)
      return { ok: false, error: 'Photo invalide.' };
    if (sel.captionSource === 'free' && !sel.caption.trim())
      return { ok: false, error: 'Texte requis pour la légende libre.' };
    if (sel.captionSource === 'testimonial' && !sel.testimonialId)
      return { ok: false, error: 'Témoignage requis.' };
  }

  const cost = selections.length;
  const balance = await getBalance(user.id);
  if (balance < cost)
    return { ok: false, error: 'Solde insuffisant.', needsCredits: cost - balance };

  // Admin-side compute balance check — every user generation also debits
  // Studia credits from the platform's pool. Refuse upfront if the pool
  // can't cover the whole batch, otherwise the user would burn their
  // Testimona credits on a no-op.
  const computeBalance = await getStudiaBalance();
  const computeNeeded = cost * STUDIA_COST_PER_VIDEO;
  if (computeBalance < computeNeeded) {
    return {
      ok: false,
      error:
        'Service indisponible momentanément. Réessaie dans quelques minutes — l\'admin a été notifié.',
    };
  }

  const createdClipIds: string[] = [];

  // Submit one job per selection. We spend credits one-by-one to keep
  // partial-success semantics: if Higgsfield returns an error after 3
  // clips, the user keeps the 9 credits they didn't burn.
  for (const sel of selections) {
    const photo = photosById.get(sel.photoId);
    if (!photo) continue;

    const caption = (sel.caption || '').slice(0, MAX_PROMPT_LEN);
    const prompt = caption || 'Animate this portrait gracefully';

    const spend = await spendCredits(user.id, 1, {
      note: `Animation photo ${photo.id.slice(0, 8)}`,
    });
    if (!spend.ok)
      return {
        ok: false,
        error: spend.error,
        createdClipIds,
      };

    const { data: clip, error: insertErr } = await supabase
      .from('MemorialClip')
      .insert({
        memorialId,
        photoId: sel.photoId,
        caption: caption || null,
        captionSource: sel.captionSource,
        testimonialId:
          sel.captionSource === 'testimonial' ? sel.testimonialId : null,
        status: 'pending',
        createdById: user.id,
        creditCost: 1,
        providerCreditCost: STUDIA_COST_PER_VIDEO,
      })
      .select('id')
      .single<{ id: string }>();

    if (insertErr || !clip) {
      return {
        ok: false,
        error: insertErr?.message ?? 'Insert clip failed',
        createdClipIds,
      };
    }

    const job = await submitImageToVideo({
      imageUrl: photo.url,
      prompt,
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
        .eq('id', clip.id);
      // refund this single clip; spendCredits already wrote a debit, so
      // we add it back through the standard path
      await supabase.from('CreditTransaction').insert({
        userId: user.id,
        amount: 1,
        type: 'refund',
        memorialClipId: clip.id,
        note: 'Génération échouée — remboursé',
      });
      continue;
    }

    await supabase
      .from('MemorialClip')
      .update({
        higgsfieldJobId: job.jobId,
        status: 'processing',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', clip.id);

    // Debit the platform compute pool — each generation costs the
    // admin STUDIA_COST_PER_VIDEO from their Studia balance.
    await spendStudia(STUDIA_COST_PER_VIDEO, {
      memorialClipId: clip.id,
      note: 'Animation user',
    });

    createdClipIds.push(clip.id);
  }

  revalidatePath(`/memorial/${memorial.slug}`);
  revalidatePath('/dashboard/clips');
  revalidatePath('/dashboard/profile/credits');
  revalidatePath('/dashboard/profile');

  return { ok: true, createdClipIds };
}

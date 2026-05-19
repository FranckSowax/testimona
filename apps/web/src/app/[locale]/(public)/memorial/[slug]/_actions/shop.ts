'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  falSubmitImage,
  isFalImageConfigured,
} from '@/lib/fal/image';
import { findProduct } from '@/lib/shop/catalog';

export interface ShopActionState {
  ok?: boolean;
  error?: string;
}

interface MemorialOwnerRow {
  id: string;
  ownerId: string;
  slug: string;
}

async function loadOwnedMemorial(
  memorialId: string,
  userId: string,
): Promise<MemorialOwnerRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('id, ownerId, slug')
    .eq('id', memorialId)
    .maybeSingle<MemorialOwnerRow>();
  if (!data) return null;
  if (data.ownerId !== userId) return null;
  return data;
}

// =========================================================================
// Visual generation
// =========================================================================

export async function generateMemorialVisualAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };

  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const photoId = String(formData.get('photoId') ?? '').trim();
  const extraPrompt = String(formData.get('extraPrompt') ?? '').trim().slice(0, 400);
  if (!memorialId) return { error: 'memorialId requis.' };
  if (!photoId) return { error: 'Photo requise.' };

  const memorial = await loadOwnedMemorial(memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };

  const supabase = getSupabaseAdminClient();
  const { data: photo } = await supabase
    .from('Photo')
    .select('id, url, memorialId')
    .eq('id', photoId)
    .maybeSingle<{ id: string; url: string; memorialId: string }>();
  if (!photo || photo.memorialId !== memorialId)
    return { error: 'Photo invalide.' };

  if (!isFalImageConfigured()) {
    return {
      error:
        'Service de génération indisponible. L\'admin doit configurer le fournisseur.',
    };
  }

  const { data: visual, error: insErr } = await supabase
    .from('MemorialVisual')
    .insert({
      memorialId,
      sourcePhotoId: photoId,
      prompt: extraPrompt || null,
      status: 'pending',
      createdById: user.id,
    })
    .select('id')
    .single<{ id: string }>();
  if (insErr || !visual) {
    return { error: insErr?.message ?? 'Insert visual failed' };
  }

  const job = await falSubmitImage({
    imageUrl: photo.url,
    extraPrompt: extraPrompt || undefined,
  });
  if ('error' in job) {
    await supabase
      .from('MemorialVisual')
      .update({
        status: 'failed',
        errorMessage: job.error,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', visual.id);
    return { error: job.error };
  }

  await supabase
    .from('MemorialVisual')
    .update({
      providerJobId: job.jobId,
      status: 'processing',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', visual.id);

  revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

// =========================================================================
// Shop wishlist management (owner)
// =========================================================================

export async function addShopItemAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };

  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const productId = String(formData.get('productId') ?? '').trim();
  const targetQuantity = parseInt(String(formData.get('targetQuantity') ?? '0'), 10);
  const unitPriceEuros = parseFloat(String(formData.get('unitPriceEuros') ?? '0'));
  const unitPriceCents = Math.round(unitPriceEuros * 100);
  const visualIdRaw = String(formData.get('visualId') ?? '').trim();
  const visualId = visualIdRaw || null;
  const notes = String(formData.get('notes') ?? '').trim().slice(0, 300) || null;

  if (!memorialId) return { error: 'memorialId requis.' };
  const product = findProduct(productId);
  if (!product) return { error: 'Produit inconnu.' };
  if (!Number.isFinite(targetQuantity) || targetQuantity <= 0)
    return { error: 'Quantité invalide.' };
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0)
    return { error: 'Prix unitaire invalide.' };

  const memorial = await loadOwnedMemorial(memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };

  const supabase = getSupabaseAdminClient();
  // Get next position
  const { data: existing } = await supabase
    .from('MemorialShopItem')
    .select('position')
    .eq('memorialId', memorialId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPos = (existing?.position ?? -1) + 1;

  const { error } = await supabase.from('MemorialShopItem').insert({
    memorialId,
    productId,
    visualId,
    targetQuantity,
    unitPriceCents,
    notes,
    position: nextPos,
  });
  if (error) return { error: error.message };

  revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

export async function removeShopItemAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const supabase = getSupabaseAdminClient();
  const { data: item } = await supabase
    .from('MemorialShopItem')
    .select('memorialId')
    .eq('id', id)
    .maybeSingle<{ memorialId: string }>();
  if (!item) return { error: 'Item introuvable.' };
  const memorial = await loadOwnedMemorial(item.memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };

  const { error } = await supabase.from('MemorialShopItem').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

// =========================================================================
// Visitor contribution
// =========================================================================

export async function contributeToShopItemAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const shopItemId = String(formData.get('shopItemId') ?? '').trim();
  const amountEuros = parseFloat(String(formData.get('amount') ?? '0'));
  const donorName = String(formData.get('donorName') ?? '').trim().slice(0, 80) || null;
  const donorEmail = String(formData.get('donorEmail') ?? '').trim().slice(0, 200) || null;
  const message = String(formData.get('message') ?? '').trim().slice(0, 280) || null;

  if (!shopItemId) return { error: 'shopItemId requis.' };
  if (!Number.isFinite(amountEuros) || amountEuros < 1)
    return { error: 'Montant minimum : 1€.' };

  const amountCents = Math.round(amountEuros * 100);
  const user = await getCurrentUser();

  const supabase = getSupabaseAdminClient();
  const { data: item } = await supabase
    .from('MemorialShopItem')
    .select('id, memorialId')
    .eq('id', shopItemId)
    .maybeSingle<{ id: string; memorialId: string }>();
  if (!item) return { error: 'Item introuvable.' };

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('slug, isPublic')
    .eq('id', item.memorialId)
    .maybeSingle<{ slug: string; isPublic: boolean }>();
  if (!memorial?.isPublic && !user) {
    return { error: 'Mémorial privé — connexion requise.' };
  }

  const { error } = await supabase.from('ShopContribution').insert({
    shopItemId,
    donorId: user?.id ?? null,
    donorName: donorName ?? user?.email ?? null,
    donorEmail: donorEmail ?? user?.email ?? null,
    amountCents,
    message,
    // Demo: skip Stripe, mark as Succeeded immediately. Real flow will
    // start as 'Processing' and flip to 'Succeeded' on webhook.
    status: 'Succeeded',
  });
  if (error) return { error: error.message };

  if (memorial?.slug) revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

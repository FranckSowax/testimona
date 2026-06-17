'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  falSubmitImage,
  isFalImageConfigured,
} from '@/lib/fal/image';
import { canManageMemorial } from '@/lib/memorial/access';
import { findProduct, type ShopProduct } from '@/lib/shop/catalog';

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
  // G3 — owner OR an accepted co-owner may manage the shop.
  if (!(await canManageMemorial(memorialId, userId))) return null;
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

/**
 * Owner re-runs the same visual generation prompt against the same
 * source photo. Creates a NEW MemorialVisual row so the previous one
 * stays available — owner picks the best one later.
 */
export async function regenerateMemorialVisualAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const supabase = getSupabaseAdminClient();
  const { data: visual } = await supabase
    .from('MemorialVisual')
    .select('memorialId, sourcePhotoId, prompt')
    .eq('id', id)
    .maybeSingle<{
      memorialId: string;
      sourcePhotoId: string | null;
      prompt: string | null;
    }>();
  if (!visual || !visual.sourcePhotoId)
    return { error: 'Visuel introuvable ou sans photo source.' };

  const memorial = await loadOwnedMemorial(visual.memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };

  if (!isFalImageConfigured()) {
    return { error: 'Service de génération indisponible.' };
  }

  const { data: photo } = await supabase
    .from('Photo')
    .select('url')
    .eq('id', visual.sourcePhotoId)
    .maybeSingle<{ url: string }>();
  if (!photo) return { error: 'Photo source introuvable.' };

  const { data: newVisual, error: insErr } = await supabase
    .from('MemorialVisual')
    .insert({
      memorialId: visual.memorialId,
      sourcePhotoId: visual.sourcePhotoId,
      prompt: visual.prompt,
      status: 'pending',
      createdById: user.id,
    })
    .select('id')
    .single<{ id: string }>();
  if (insErr || !newVisual) {
    return { error: insErr?.message ?? 'Insert visual failed' };
  }

  const job = await falSubmitImage({
    imageUrl: photo.url,
    extraPrompt: visual.prompt ?? undefined,
  });
  if ('error' in job) {
    await supabase
      .from('MemorialVisual')
      .update({
        status: 'failed',
        errorMessage: job.error,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', newVisual.id);
    return { error: job.error };
  }

  await supabase
    .from('MemorialVisual')
    .update({
      providerJobId: job.jobId,
      status: 'processing',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', newVisual.id);

  revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

/**
 * Owner removes a generated visual from the available pool. Cascade
 * via FK clears the visualId on any shop item referencing it, so the
 * item simply loses its visual and shows the fallback icon/skeleton.
 */
export async function deleteMemorialVisualAction(
  _prev: ShopActionState | null,
  formData: FormData,
): Promise<ShopActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const supabase = getSupabaseAdminClient();
  const { data: visual } = await supabase
    .from('MemorialVisual')
    .select('memorialId')
    .eq('id', id)
    .maybeSingle<{ memorialId: string }>();
  if (!visual) return { error: 'Visuel introuvable.' };

  const memorial = await loadOwnedMemorial(visual.memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };

  const { error } = await supabase.from('MemorialVisual').delete().eq('id', id);
  if (error) return { error: error.message };

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

  // PDF p33 — éviter les doublons : un même produit ne peut être ajouté
  // qu'une seule fois par mémorial.
  const { data: duplicate } = await supabase
    .from('MemorialShopItem')
    .select('id')
    .eq('memorialId', memorialId)
    .eq('productId', productId)
    .maybeSingle<{ id: string }>();
  if (duplicate) return { error: 'Cet article est déjà dans la boutique.' };

  // Get next position
  const { data: existing } = await supabase
    .from('MemorialShopItem')
    .select('position')
    .eq('memorialId', memorialId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPos = (existing?.position ?? -1) + 1;

  // Stage mockup pipeline: pending if the product supports mockup AND
  // a visual is attached; skipped otherwise (e.g. partner products,
  // digital-card where the visual IS the product).
  const mockupReady = !!visualId && !!product.mockupPromptSuffix;
  const mockupStatus = mockupReady ? 'pending' : 'skipped';

  const { data: inserted, error } = await supabase
    .from('MemorialShopItem')
    .insert({
      memorialId,
      productId,
      visualId,
      targetQuantity,
      unitPriceCents,
      notes,
      position: nextPos,
      mockupStatus,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !inserted) return { error: error?.message ?? 'Insert failed' };

  // Auto-trigger mockup generation in the background. Failure here
  // doesn't block the add — the owner sees the item and can manually
  // retry via the regen button if it ever fails.
  if (mockupReady) {
    void triggerShopItemMockupInternal(inserted.id, product);
  }

  revalidatePath(`/memorial/${memorial.slug}`);
  return { ok: true };
}

// =========================================================================
// Shop item mockup generation
// =========================================================================

interface ShopItemForMockup {
  id: string;
  memorialId: string;
  productId: string;
  visualUrl: string | null;
}

async function loadShopItemForMockup(
  itemId: string,
): Promise<ShopItemForMockup | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('MemorialShopItem')
    .select(
      `id, memorialId, productId,
       MemorialVisual:MemorialVisual!MemorialShopItem_visualId_fkey(imageUrl, status)`,
    )
    .eq('id', itemId)
    .maybeSingle<{
      id: string;
      memorialId: string;
      productId: string;
      MemorialVisual: { imageUrl: string | null; status: string } | null;
    }>();
  if (!data) return null;
  const visualUrl =
    data.MemorialVisual?.status === 'ready'
      ? data.MemorialVisual.imageUrl
      : null;
  return {
    id: data.id,
    memorialId: data.memorialId,
    productId: data.productId,
    visualUrl: visualUrl ?? null,
  };
}

async function triggerShopItemMockupInternal(
  itemId: string,
  product: ShopProduct,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!product.mockupPromptSuffix) {
    await supabase
      .from('MemorialShopItem')
      .update({
        mockupStatus: 'skipped',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', itemId);
    return;
  }

  if (!isFalImageConfigured()) {
    await supabase
      .from('MemorialShopItem')
      .update({
        mockupStatus: 'failed',
        mockupErrorMessage: 'fal not configured',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', itemId);
    return;
  }

  const item = await loadShopItemForMockup(itemId);
  if (!item || !item.visualUrl) {
    await supabase
      .from('MemorialShopItem')
      .update({
        mockupStatus: 'skipped',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', itemId);
    return;
  }

  const job = await falSubmitImage({
    imageUrl: item.visualUrl,
    overridePrompt: product.mockupPromptSuffix,
  });
  if ('error' in job) {
    await supabase
      .from('MemorialShopItem')
      .update({
        mockupStatus: 'failed',
        mockupErrorMessage: job.error,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', itemId);
    return;
  }

  await supabase
    .from('MemorialShopItem')
    .update({
      mockupJobId: job.jobId,
      mockupStatus: 'processing',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', itemId);
}

/** Owner-facing action to (re)trigger mockup generation for an item. */
export async function regenerateShopItemMockupAction(
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
    .select('memorialId, productId')
    .eq('id', id)
    .maybeSingle<{ memorialId: string; productId: string }>();
  if (!item) return { error: 'Item introuvable.' };
  const memorial = await loadOwnedMemorial(item.memorialId, user.id);
  if (!memorial) return { error: 'Action réservée au propriétaire.' };
  const product = findProduct(item.productId);
  if (!product) return { error: 'Produit inconnu.' };

  await supabase
    .from('MemorialShopItem')
    .update({
      mockupStatus: 'pending',
      mockupErrorMessage: null,
      mockupImageUrl: null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);

  void triggerShopItemMockupInternal(id, product);

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

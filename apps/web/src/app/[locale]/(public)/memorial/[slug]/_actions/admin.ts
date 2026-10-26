'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { revalidateMemorialPages } from '@/lib/revalidate';

export interface AdminActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function ensureOwner(
  memorialId: string,
): Promise<{ supabase: Awaited<ReturnType<typeof getSupabaseServer>>; userId: string } | string> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 'Non connecté.';

  // G3 — owner OR an accepted co-owner may manage.
  if (!(await canManageMemorial(memorialId, userData.user.id))) {
    return 'Action réservée aux administrateurs du mémorial.';
  }
  return { supabase, userId: userData.user.id };
}

/**
 * D3/D4 (PDF p29) — Owner edits the fundraising goal, currency and the
 * "About the donation" message shown to potential donors.
 */
export async function updateDonationSettingsAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!memorialId) return { error: 'memorialId requis.' };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const goalEuros = Number.parseFloat(String(formData.get('goalEuros') ?? '0'));
  const goalCents = Number.isFinite(goalEuros) ? Math.max(0, Math.round(goalEuros * 100)) : 0;
  const currencyRaw = String(formData.get('currency') ?? 'EUR')
    .trim()
    .toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : 'EUR';
  const about =
    String(formData.get('about') ?? '')
      .trim()
      .slice(0, 1000) || null;

  const { error } = await supabase
    .from('Memorial')
    .update({
      donationGoalCents: goalCents,
      donationCurrency: currency,
      donationAbout: about,
    })
    .eq('id', memorialId);
  if (error) return { error: error.message };

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Update biography info fields (PDF p38).
 * Auto-create Biography row if missing.
 */
export async function updateBiographyInfoAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!memorialId) return { error: 'memorialId requis.' };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const payload = {
    username: String(formData.get('username') ?? '').trim() || null,
    homeCity: String(formData.get('homeCity') ?? '').trim() || null,
    placesLived: String(formData.get('placesLived') ?? '').trim() || null,
    relatives: String(formData.get('relatives') ?? '').trim() || null,
    religion: String(formData.get('religion') ?? '').trim() || null,
    education: String(formData.get('education') ?? '').trim() || null,
    work: String(formData.get('work') ?? '').trim() || null,
    hobby: String(formData.get('hobby') ?? '').trim() || null,
    socialLinks: String(formData.get('socialLinks') ?? '').trim() || null,
  };

  const { data: bio } = await supabase
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();

  if (bio) {
    const { error } = await supabase.from('Biography').update(payload).eq('id', bio.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('Biography')
      .insert({ id: randomUUID(), memorialId, ...payload });
    if (error) return { error: error.message };
  }

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Delete biography info (the structured fields). Keeps chapters intact —
 * relatives can still rebuild the bio later by editing.
 */
export async function deleteBiographyInfoAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!memorialId) return { error: 'memorialId requis.' };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const { data: bio } = await supabase
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();

  if (bio) {
    const { error } = await supabase
      .from('Biography')
      .update({
        username: null,
        homeCity: null,
        placesLived: null,
        relatives: null,
        religion: null,
        education: null,
        work: null,
        hobby: null,
        socialLinks: null,
      })
      .eq('id', bio.id);
    if (error) return { error: error.message };
  }

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Update Funeral description (PDF p42).
 */
export async function updateFuneralInfoAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!memorialId) return { error: 'memorialId requis.' };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();

  if (funeral) {
    const { error } = await supabase.from('Funeral').update({ description }).eq('id', funeral.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('Funeral')
      .insert({ id: randomUUID(), memorialId, description });
    if (error) return { error: error.message };
  }

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Update donation goal/currency/about (PDF p32).
 */
export async function updateDonationsConfigAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const about = String(formData.get('about') ?? '').trim();
  const goalAmount = Number.parseFloat(String(formData.get('goalAmount') ?? '0'));
  const currency = String(formData.get('currency') ?? 'EUR').trim();

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!about) return { error: 'Validation', fieldErrors: { about: 'Description requise.' } };
  if (!Number.isFinite(goalAmount) || goalAmount < 0)
    return { error: 'Validation', fieldErrors: { goalAmount: 'Montant invalide.' } };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const { error } = await supabase
    .from('Memorial')
    .update({
      donationGoalCents: Math.round(goalAmount * 100),
      donationCurrency: currency,
      donationAbout: about,
    })
    .eq('id', memorialId);
  if (error) return { error: error.message };

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Request to become an admin (PDF p23 column A).
 */
export async function requestAdminAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const relationship = String(formData.get('relationship') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!relationship)
    return { error: 'Validation', fieldErrors: { relationship: 'Relation requise.' } };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  const { error } = await supabase.from('MemorialAdminRequest').insert({
    memorialId,
    userId: userData.user.id,
    relationship,
    note,
  });
  if (error) return { error: error.message };

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

/**
 * V2 — Accept or decline an admin request (G3). The MemorialAdminRequest row
 * keeps the audit trail; accepting now ALSO creates an accepted MemorialMember
 * so the requester actually gains co-management rights.
 */
export async function resolveAdminRequestAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const requestId = String(formData.get('requestId') ?? '').trim();
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  if (!requestId || !memorialId) return { error: 'requestId/memorialId requis.' };
  if (decision !== 'accepted' && decision !== 'declined') return { error: 'Décision invalide.' };

  const owner = await ensureOwner(memorialId);
  if (typeof owner === 'string') return { error: owner };
  const { supabase } = owner;

  const { data: request, error } = await supabase
    .from('MemorialAdminRequest')
    .update({ status: decision })
    .eq('id', requestId)
    .eq('memorialId', memorialId)
    .select('userId')
    .maybeSingle<{ userId: string }>();
  if (error) return { error: error.message };

  // Grant actual co-ownership on accept.
  if (decision === 'accepted' && request?.userId) {
    const adminDb = getSupabaseAdminClient();
    const { data: existing } = await adminDb
      .from('MemorialMember')
      .select('id')
      .eq('memorialId', memorialId)
      .eq('userId', request.userId)
      .maybeSingle<{ id: string }>();
    if (existing) {
      await adminDb
        .from('MemorialMember')
        .update({ status: 'accepted', role: 'admin', updatedAt: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminDb.from('MemorialMember').insert({
        memorialId,
        userId: request.userId,
        role: 'admin',
        status: 'accepted',
      });
    }
  }

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';
import { AD_SLOTS, type AdType } from '@/lib/admin/ads';

export interface AdActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    slot: String(formData.get('slot') ?? '').trim(),
    type: String(formData.get('type') ?? 'image').trim() as AdType,
    imageUrl: String(formData.get('imageUrl') ?? '').trim() || null,
    targetUrl: String(formData.get('targetUrl') ?? '').trim() || null,
    html: String(formData.get('html') ?? '').trim() || null,
    isActive: String(formData.get('isActive') ?? '') === 'on',
    startsAt: String(formData.get('startsAt') ?? '').trim() || null,
    expiresAt: String(formData.get('expiresAt') ?? '').trim() || null,
  };
}

function validate(p: ReturnType<typeof readForm>): Record<string, string> | null {
  const errors: Record<string, string> = {};
  if (!p.name) errors.name = 'requis';
  if (!p.slot) errors.slot = 'requis';
  if (!AD_SLOTS.includes(p.slot as (typeof AD_SLOTS)[number]))
    errors.slot = 'slot inconnu';
  if (p.type !== 'image' && p.type !== 'html') errors.type = 'invalide';
  if (p.type === 'image' && !p.imageUrl) errors.imageUrl = 'requis pour le type image';
  if (p.type === 'html' && !p.html) errors.html = 'requis pour le type html';
  return Object.keys(errors).length ? errors : null;
}

export async function createAdAction(
  _prev: AdActionState | null,
  formData: FormData,
): Promise<AdActionState> {
  await requireAdmin();
  const payload = readForm(formData);
  const fieldErrors = validate(payload);
  if (fieldErrors) return { error: 'Validation', fieldErrors };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('AdSpace').insert(payload);
  if (error) return { error: error.message };

  revalidatePath('/admin/ads');
  revalidatePath('/');
  redirect('/admin/ads');
}

export async function updateAdAction(
  _prev: AdActionState | null,
  formData: FormData,
): Promise<AdActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };
  const payload = readForm(formData);
  const fieldErrors = validate(payload);
  if (fieldErrors) return { error: 'Validation', fieldErrors };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('AdSpace')
    .update({ ...payload, updatedAt: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/ads');
  revalidatePath('/');
  redirect('/admin/ads');
}

export async function deleteAdAction(
  _prev: AdActionState | null,
  formData: FormData,
): Promise<AdActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'id requis.' };
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('AdSpace').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/ads');
  revalidatePath('/');
  return { ok: true };
}

export async function toggleAdActiveAction(
  _prev: AdActionState | null,
  formData: FormData,
): Promise<AdActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  const isActive = String(formData.get('isActive') ?? '') === 'true';
  if (!id) return { error: 'id requis.' };
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('AdSpace')
    .update({ isActive, updatedAt: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/ads');
  revalidatePath('/');
  return { ok: true };
}

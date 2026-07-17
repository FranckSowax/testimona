'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canManageMemorial } from '@/lib/memorial/access';

export interface FuneralEventActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface FuneralRow {
  id: string;
}

interface PositionRow {
  position: number;
}

/**
 * V2 Server Action — create a Funeral Event (PDF p43-44).
 * Auto-creates the parent Funeral row if not exists.
 * Owner-only via Memorial.ownerId match.
 */
export async function createFuneralEventAction(
  _prev: FuneralEventActionState | null,
  formData: FormData,
): Promise<FuneralEventActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const startsAt = String(formData.get('startsAt') ?? '').trim();
  const endsAt = String(formData.get('endsAt') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!title) return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };
  if (!date) return { error: 'Validation', fieldErrors: { date: 'Date requise.' } };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  if (!(await canManageMemorial(memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  let { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<FuneralRow>();

  if (!funeral) {
    const { data: created, error: createErr } = await supabase
      .from('Funeral')
      .insert({ id: randomUUID(), memorialId })
      .select('id')
      .maybeSingle<FuneralRow>();
    if (createErr || !created) {
      return { error: createErr?.message ?? 'Échec création section funérailles.' };
    }
    funeral = created;
  }

  const { data: lastPos } = await supabase
    .from('FuneralEvent')
    .select('position')
    .eq('funeralId', funeral.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<PositionRow>();
  const nextPosition = (lastPos?.position ?? -1) + 1;

  // Schema FuneralEvent has only `hour` (single text field) — combine starts–ends
  const hour = endsAt ? `${startsAt} – ${endsAt}` : startsAt;

  const { error } = await supabase.from('FuneralEvent').insert({
    id: randomUUID(),
    funeralId: funeral.id,
    title,
    date,
    hour,
    url: url || null,
    note: note || null,
    location: location || null,
    address: address || null,
    position: nextPosition,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

/**
 * V2 Server Action — update an existing Funeral Event (PDF p39 "bouton edit
 * pour modifier l'évènement"). Owner-only via Memorial.ownerId.
 */
export async function updateFuneralEventAction(
  _prev: FuneralEventActionState | null,
  formData: FormData,
): Promise<FuneralEventActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const date = String(formData.get('date') ?? '').trim();
  const startsAt = String(formData.get('startsAt') ?? '').trim();
  const endsAt = String(formData.get('endsAt') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();

  if (!id) return { error: 'id requis.' };
  if (!title) return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };
  if (!date) return { error: 'Validation', fieldErrors: { date: 'Date requise.' } };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  // Resolve memorial via the parent Funeral row to check ownership.
  const { data: event } = await supabase
    .from('FuneralEvent')
    .select('funeralId')
    .eq('id', id)
    .maybeSingle<{ funeralId: string }>();
  if (!event) return { error: 'Événement introuvable.' };

  const { data: funeral } = await supabase
    .from('Funeral')
    .select('memorialId')
    .eq('id', event.funeralId)
    .maybeSingle<{ memorialId: string }>();
  if (!funeral) return { error: 'Funérailles introuvables.' };

  if (!(await canManageMemorial(funeral.memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  const hour = endsAt ? `${startsAt} – ${endsAt}` : startsAt;

  const { error } = await supabase
    .from('FuneralEvent')
    .update({
      title,
      date,
      hour,
      url: url || null,
      note: note || null,
      location: location || null,
      address: address || null,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

/**
 * Delete a funeral event. Owner-only via Memorial.ownerId.
 */
export async function deleteFuneralEventAction(
  _prev: FuneralEventActionState | null,
  formData: FormData,
): Promise<FuneralEventActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!id) return { error: 'id requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  // Resolve memorial via the parent Funeral row to check ownership.
  const { data: event } = await supabase
    .from('FuneralEvent')
    .select('funeralId')
    .eq('id', id)
    .maybeSingle<{ funeralId: string }>();
  if (!event) return { error: 'Événement introuvable.' };

  const { data: funeral } = await supabase
    .from('Funeral')
    .select('memorialId')
    .eq('id', event.funeralId)
    .maybeSingle<{ memorialId: string }>();
  if (!funeral) return { error: 'Funérailles introuvables.' };

  if (!(await canManageMemorial(funeral.memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  const { error } = await supabase.from('FuneralEvent').delete().eq('id', id);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

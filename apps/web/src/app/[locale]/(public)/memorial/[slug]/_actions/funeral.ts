'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

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

interface MemorialOwnerRow {
  ownerId: string;
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
  const location = String(formData.get('location') ?? '').trim();

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!title) return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };
  if (!date) return { error: 'Validation', fieldErrors: { date: 'Date requise.' } };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('ownerId')
    .eq('id', memorialId)
    .maybeSingle<MemorialOwnerRow>();
  if (!memorial || memorial.ownerId !== userData.user.id) {
    return { error: 'Action réservée au propriétaire du mémorial.' };
  }

  let { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<FuneralRow>();

  if (!funeral) {
    const { data: created, error: createErr } = await supabase
      .from('Funeral')
      .insert({ memorialId })
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
    funeralId: funeral.id,
    title,
    date,
    hour,
    location: location || null,
    position: nextPosition,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

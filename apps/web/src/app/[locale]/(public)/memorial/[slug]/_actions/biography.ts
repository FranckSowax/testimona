'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface ChapterActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface BiographyRow {
  id: string;
}

interface ChapterPositionRow {
  position: number;
}

interface MemorialOwnerRow {
  ownerId: string;
}

/**
 * V2 Server Action — create a new Biography Chapter (PDF p39).
 * Auto-creates the parent Biography row if not exists.
 * Owner-only via Memorial.ownerId match.
 */
export async function createChapterAction(
  _prev: ChapterActionState | null,
  formData: FormData,
): Promise<ChapterActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!title) return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };

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

  let { data: bio } = await supabase
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();

  if (!bio) {
    const { data: created, error: createErr } = await supabase
      .from('Biography')
      .insert({ memorialId })
      .select('id')
      .maybeSingle<BiographyRow>();
    if (createErr || !created) {
      return { error: createErr?.message ?? 'Échec création biographie.' };
    }
    bio = created;
  }

  const { data: lastPos } = await supabase
    .from('Chapter')
    .select('position')
    .eq('biographyId', bio.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<ChapterPositionRow>();
  const nextPosition = (lastPos?.position ?? -1) + 1;

  const { error } = await supabase.from('Chapter').insert({
    biographyId: bio.id,
    title,
    content: content || '',
    position: nextPosition,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, requireAdmin } from '@/lib/supabase/admin';

export interface AdminMemorialActionState {
  ok?: boolean;
  error?: string;
}

export async function setMemorialVisibilityAction(
  _prev: AdminMemorialActionState | null,
  formData: FormData,
): Promise<AdminMemorialActionState> {
  await requireAdmin();
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const isPublic = String(formData.get('isPublic') ?? '') === 'true';
  if (!memorialId) return { error: 'memorialId requis.' };

  const supabase = getSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from('Memorial')
    .update({ isPublic })
    .eq('id', memorialId)
    .select('slug')
    .maybeSingle<{ slug: string }>();
  if (error) return { error: error.message };

  revalidatePath('/admin/memorials');
  revalidatePath(`/admin/memorials/${memorialId}`);
  if (row?.slug) revalidatePath(`/memorial/${row.slug}`);
  return { ok: true };
}

export async function deleteMemorialAction(
  _prev: AdminMemorialActionState | null,
  formData: FormData,
): Promise<AdminMemorialActionState> {
  await requireAdmin();
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  if (!memorialId) return { error: 'memorialId requis.' };

  const supabase = getSupabaseAdminClient();
  // Best-effort cascade: rely on Postgres FK ON DELETE CASCADE if configured,
  // otherwise clean up children explicitly first.
  await supabase.from('Testimonial').delete().eq('memorialId', memorialId);
  await supabase.from('Photo').delete().eq('memorialId', memorialId);
  await supabase.from('Donation').delete().eq('memorialId', memorialId);
  const { data: bio } = await supabase
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();
  if (bio?.id) {
    await supabase.from('Chapter').delete().eq('biographyId', bio.id);
    await supabase.from('Biography').delete().eq('id', bio.id);
  }
  const { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();
  if (funeral?.id) {
    await supabase.from('FuneralEvent').delete().eq('funeralId', funeral.id);
    await supabase.from('Funeral').delete().eq('id', funeral.id);
  }
  await supabase.from('MemorialAdminRequest').delete().eq('memorialId', memorialId);

  const { error } = await supabase.from('Memorial').delete().eq('id', memorialId);
  if (error) return { error: error.message };

  revalidatePath('/admin/memorials');
  return { ok: true };
}

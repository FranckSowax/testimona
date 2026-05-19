import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { falGetImageStatus } from '@/lib/fal/image';

interface VisualRow {
  id: string;
  providerJobId: string | null;
  status: string;
  memorialId: string;
}

/**
 * Drains pending/processing memorial visuals — polls fal for each, mirrors
 * the result image url onto the row when ready. Mirroring to Supabase
 * Storage can be added later; for now we serve fal's CDN URL directly.
 */
export async function POST() {
  const supabase = getSupabaseAdminClient();
  const { data: visuals } = await supabase
    .from('MemorialVisual')
    .select('id, providerJobId, status, memorialId')
    .in('status', ['pending', 'processing'])
    .order('createdAt', { ascending: true })
    .limit(20)
    .returns<VisualRow[]>();

  if (!visuals || visuals.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let updated = 0;
  for (const v of visuals) {
    if (!v.providerJobId) continue;
    const status = await falGetImageStatus(v.providerJobId);

    if (status.status === 'processing') {
      if (v.status !== 'processing') {
        await supabase
          .from('MemorialVisual')
          .update({ status: 'processing', updatedAt: new Date().toISOString() })
          .eq('id', v.id);
      }
      continue;
    }

    if (status.status === 'ready' && status.imageUrl) {
      await supabase
        .from('MemorialVisual')
        .update({
          status: 'ready',
          imageUrl: status.imageUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', v.id);
      updated += 1;
      continue;
    }

    // failed
    await supabase
      .from('MemorialVisual')
      .update({
        status: 'failed',
        errorMessage: status.error ?? 'unknown',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', v.id);
    updated += 1;
  }

  return NextResponse.json({ processed: visuals.length, updated });
}

export async function GET() {
  return POST();
}

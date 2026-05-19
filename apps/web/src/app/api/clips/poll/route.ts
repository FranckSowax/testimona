import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getJobStatus } from '@/lib/higgsfield/client';
import { mirrorClipToStorage } from '@/lib/higgsfield/storage';
import { refundCredits } from '@/lib/credits/balance';

interface ClipRow {
  id: string;
  higgsfieldJobId: string | null;
  status: string;
  creditCost: number;
  createdById: string;
}

/**
 * Drain up to 10 pending/processing clips: poll Higgsfield, mirror MP4 to
 * Supabase Storage on success, refund credits on failure. Idempotent —
 * safe to hit from client polling, an admin button, or a cron job.
 */
export async function POST() {
  const supabase = getSupabaseAdminClient();
  const { data: clips } = await supabase
    .from('MemorialClip')
    .select('id, higgsfieldJobId, status, creditCost, createdById')
    .in('status', ['pending', 'processing'])
    .order('createdAt', { ascending: true })
    .limit(10)
    .returns<ClipRow[]>();

  if (!clips || clips.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let updated = 0;
  for (const clip of clips) {
    if (!clip.higgsfieldJobId) continue;
    const job = await getJobStatus(clip.higgsfieldJobId);

    if (job.status === 'processing') {
      if (clip.status !== 'processing') {
        await supabase
          .from('MemorialClip')
          .update({ status: 'processing', updatedAt: new Date().toISOString() })
          .eq('id', clip.id);
      }
      continue;
    }

    if (job.status === 'ready' && job.videoUrl) {
      // Demo mode jobs use a public CDN URL — no need to mirror, the
      // <video> tag can stream it directly. We only mirror real
      // Higgsfield CDN URLs which can expire or have CORS limits.
      const isDemo = clip.higgsfieldJobId.startsWith('demo_');
      const finalUrl = isDemo
        ? job.videoUrl
        : await mirrorClipToStorage(clip.id, job.videoUrl).then((m) =>
            m.ok ? m.url : null,
          );

      if (!finalUrl) {
        await supabase
          .from('MemorialClip')
          .update({
            status: 'failed',
            errorMessage: 'storage mirror failed',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', clip.id);
        await refundCredits(clip.createdById, clip.creditCost, {
          memorialClipId: clip.id,
          note: 'Stockage du clip échoué — remboursé',
        });
        continue;
      }
      await supabase
        .from('MemorialClip')
        .update({
          status: 'ready',
          videoUrl: finalUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', clip.id);
      updated += 1;
      continue;
    }

    // failed
    await supabase
      .from('MemorialClip')
      .update({
        status: 'failed',
        errorMessage: job.error ?? 'unknown',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', clip.id);
    await refundCredits(clip.createdById, clip.creditCost, {
      memorialClipId: clip.id,
      note: 'Génération échouée — remboursé',
    });
    updated += 1;
  }

  return NextResponse.json({ processed: clips.length, updated });
}

export async function GET() {
  return POST();
}

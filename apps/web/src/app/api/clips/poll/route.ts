import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getJobStatus } from '@/lib/higgsfield/client';
import { mirrorClipToStorage } from '@/lib/higgsfield/storage';
import { refundCredits } from '@/lib/credits/balance';
import { refundStudia } from '@/lib/compute/balance';

interface ClipRow {
  id: string;
  higgsfieldJobId: string | null;
  status: string;
  creditCost: number;
  providerCreditCost: number;
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
    .select('id, higgsfieldJobId, status, creditCost, providerCreditCost, createdById')
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
      // Try to mirror the Higgsfield CDN URL into our own bucket so we
      // own the lifetime. Demo job → skip mirror (CDN sample blocks
      // hot-linkers anyway, and the <video> tag streams it directly).
      // Real job → attempt mirror, but if the mirror fails (CDN auth
      // quirk, transient failure), fall back to the original URL so the
      // user still gets their clip — losing the long-term-retention
      // guarantee is acceptable, losing the clip + credit isn't.
      const isDemo = clip.higgsfieldJobId.startsWith('demo_');
      let finalUrl = job.videoUrl;
      if (!isDemo) {
        const mirror = await mirrorClipToStorage(clip.id, job.videoUrl);
        if (mirror.ok) finalUrl = mirror.url;
        // else: silent fall-back to the original CDN URL
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
    // Refund compute too — the upstream job failed so we shouldn't bill
    // the admin for a video that never reached the user.
    if (clip.providerCreditCost > 0) {
      await refundStudia(clip.providerCreditCost, {
        memorialClipId: clip.id,
        note: 'Compute refund on failed job',
      });
    }
    updated += 1;
  }

  return NextResponse.json({ processed: clips.length, updated });
}

export async function GET() {
  return POST();
}

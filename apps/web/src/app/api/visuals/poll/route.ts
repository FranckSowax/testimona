import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { falGetImageStatus } from '@/lib/fal/image';

interface VisualRow {
  id: string;
  providerJobId: string | null;
  status: string;
  memorialId: string;
}

interface MockupRow {
  id: string;
  mockupJobId: string | null;
  mockupStatus: string;
  memorialId: string;
}

/**
 * Drains pending/processing memorial visuals AND per-item shop mockups
 * in one pass — both go through the same fal queue under the hood, so
 * we can amortise the round-trips. Mirroring to Supabase Storage can
 * be added later; for now we serve fal's CDN URL directly.
 */
export async function POST() {
  const supabase = getSupabaseAdminClient();

  const [visualsRes, mockupsRes] = await Promise.all([
    supabase
      .from('MemorialVisual')
      .select('id, providerJobId, status, memorialId')
      .in('status', ['pending', 'processing'])
      .order('createdAt', { ascending: true })
      .limit(15)
      .returns<VisualRow[]>(),
    supabase
      .from('MemorialShopItem')
      .select('id, mockupJobId, mockupStatus, memorialId')
      .in('mockupStatus', ['pending', 'processing'])
      .order('createdAt', { ascending: true })
      .limit(15)
      .returns<MockupRow[]>(),
  ]);

  const visuals = visualsRes.data ?? [];
  const mockups = mockupsRes.data ?? [];
  if (visuals.length === 0 && mockups.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let visualsUpdated = 0;
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
      visualsUpdated += 1;
      continue;
    }
    await supabase
      .from('MemorialVisual')
      .update({
        status: 'failed',
        errorMessage: status.error ?? 'unknown',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', v.id);
    visualsUpdated += 1;
  }

  let mockupsUpdated = 0;
  for (const m of mockups) {
    if (!m.mockupJobId) continue;
    const status = await falGetImageStatus(m.mockupJobId);

    if (status.status === 'processing') {
      if (m.mockupStatus !== 'processing') {
        await supabase
          .from('MemorialShopItem')
          .update({
            mockupStatus: 'processing',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', m.id);
      }
      continue;
    }
    if (status.status === 'ready' && status.imageUrl) {
      await supabase
        .from('MemorialShopItem')
        .update({
          mockupStatus: 'ready',
          mockupImageUrl: status.imageUrl,
          mockupErrorMessage: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', m.id);
      mockupsUpdated += 1;
      continue;
    }
    await supabase
      .from('MemorialShopItem')
      .update({
        mockupStatus: 'failed',
        mockupErrorMessage: status.error ?? 'unknown',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', m.id);
    mockupsUpdated += 1;
  }

  return NextResponse.json({
    processed: visuals.length + mockups.length,
    visualsUpdated,
    mockupsUpdated,
  });
}

export async function GET() {
  return POST();
}

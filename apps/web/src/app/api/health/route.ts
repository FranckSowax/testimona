import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'down' | 'skipped'> = { process: 'ok' };

  try {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('Memorial').select('id').limit(1);
    checks.supabase = error ? 'down' : 'ok';
  } catch {
    checks.supabase = 'down';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'skipped');
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.GIT_SHA ?? 'dev',
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}

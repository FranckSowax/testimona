import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'down' | 'skipped'> = { process: 'ok' };

  // WHY: le détail de l'erreur va dans les logs serveur (Railway) pour diagnostiquer
  // un 503, mais jamais dans la réponse, publique.
  try {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('Memorial').select('id').limit(1);
    if (error) {
      console.error('[health] Supabase check failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      });
    }
    checks.supabase = error ? 'down' : 'ok';
  } catch (err) {
    console.error('[health] Supabase check threw', {
      error: err instanceof Error ? err.message : String(err),
      supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
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

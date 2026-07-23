import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SuggestRow {
  slug: string;
  firstname: string;
  lastname: string;
  nickname: string | null;
}

/**
 * Lightweight memorial name autocomplete (PDF p7 — "des suggestions de noms
 * dès lors que l'utilisateur entre 3 lettres"). Returns up to 6 public
 * memorials matching the query by first/last name or nickname.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const term = q.replace(/[%_]/g, '\\$&');
  const pattern = `%${term}%`;

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('slug, firstname, lastname, nickname')
    .eq('isPublic', true)
    .or(`firstname.ilike.${pattern},lastname.ilike.${pattern},nickname.ilike.${pattern}`)
    .order('lastname', { ascending: true })
    .limit(6)
    .returns<SuggestRow[]>();

  const results = (data ?? []).map((m) => ({
    slug: m.slug,
    label: [m.firstname, m.lastname].filter(Boolean).join(' '),
    nickname: m.nickname,
  }));

  return NextResponse.json({ results });
}

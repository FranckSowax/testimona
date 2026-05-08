import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  birthDate: string | null;
  deathDate: string | null;
}

async function getSuggestedMemorials(): Promise<MemorialLite[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, birthDate, deathDate')
    .eq('isPublic', true)
    .order('createdAt', { ascending: false })
    .limit(5)
    .returns<MemorialLite[]>();
  return data ?? [];
}

async function getCoverByMemorial(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('memorialId, url, position')
    .in('memorialId', ids)
    .order('position', { ascending: true })
    .returns<{ memorialId: string; url: string; position: number }[]>();
  for (const p of data ?? []) {
    if (!map.has(p.memorialId)) map.set(p.memorialId, p.url);
  }
  return map;
}

function fmt(date: string | null): string {
  if (!date) return '?';
  return new Date(date).getFullYear().toString();
}

export async function RipSuggestions() {
  const memorials = await getSuggestedMemorials();
  const [covers, t] = await Promise.all([
    getCoverByMemorial(memorials.map((m) => m.id)),
    getTranslations('home.suggestions'),
  ]);

  if (memorials.length === 0) return null;

  return (
    <aside aria-labelledby="rip-suggestions-heading" className="space-y-3">
      <header>
        <h2
          id="rip-suggestions-heading"
          className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/70"
        >
          {t('title')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
      </header>
      <ul className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {memorials.map((m) => {
          const cover = covers.get(m.id);
          const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
          return (
            <li key={m.id} className="border-b border-border last:border-0">
              <Link
                href={`/memorial/${m.slug}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-surface"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface">
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <Image
                      src="/images/dove.svg"
                      alt=""
                      width={32}
                      height={32}
                      className="absolute inset-0 m-auto opacity-50"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground tabular">
                    {fmt(m.birthDate)} — {fmt(m.deathDate)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/search"
        className="inline-block text-xs font-medium text-primary hover:underline"
      >
        {t('viewAll')} →
      </Link>
    </aside>
  );
}

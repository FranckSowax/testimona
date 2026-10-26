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
          className="font-display text-foreground/70 text-sm font-semibold uppercase tracking-widest"
        >
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">{t('subtitle')}</p>
      </header>
      <ul className="border-border overflow-hidden rounded-lg border bg-white shadow-sm">
        {memorials.map((m) => {
          const cover = covers.get(m.id);
          const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
          return (
            <li key={m.id} className="border-border border-b last:border-0">
              <Link
                href={`/memorial/${m.slug}`}
                className="hover:bg-surface flex items-center gap-3 px-3 py-3"
              >
                <div className="bg-surface relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
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
                  <p className="font-display text-foreground line-clamp-2 break-words text-sm font-semibold">
                    {fullName}
                  </p>
                  <p className="text-muted-foreground tabular text-xs">
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
        className="text-primary inline-block text-xs font-medium hover:underline"
      >
        {t('viewAll')} →
      </Link>
    </aside>
  );
}

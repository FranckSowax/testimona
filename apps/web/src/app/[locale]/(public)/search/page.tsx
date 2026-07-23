import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { getSupabaseServer } from '@/lib/supabase/server';
import { MemorialCard } from '@/components/MemorialCard';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const metadata: Metadata = {
  title: 'Rechercher un mémorial',
  description: 'Recherchez un mémorial par nom, prénom ou surnom.',
};

interface MemorialRow {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
}

const PAGE_SIZE = 20;

async function searchMemorials(
  q: string,
  page: number,
): Promise<{ rows: MemorialRow[]; total: number }> {
  if (!q.trim()) return { rows: [], total: 0 };
  const supabase = await getSupabaseServer();
  const term = q.trim().replace(/[%_]/g, '\\$&');
  const pattern = `%${term}%`;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, nickname, birthDate, deathDate', { count: 'exact' })
    .eq('isPublic', true)
    .or(`firstname.ilike.${pattern},lastname.ilike.${pattern},nickname.ilike.${pattern}`)
    .order('lastname', { ascending: true })
    .range(from, to)
    .returns<MemorialRow[]>();

  return { rows: data ?? [], total: count ?? 0 };
}

async function getCoverUrls(memorialIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (memorialIds.length === 0) return map;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('memorialId, url, position')
    .in('memorialId', memorialIds)
    .order('position', { ascending: true })
    .returns<{ memorialId: string; url: string; position: number }[]>();
  for (const p of data ?? []) {
    if (!map.has(p.memorialId)) map.set(p.memorialId, p.url);
  }
  return map;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').slice(0, 100);
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  let rows: MemorialRow[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const result = await searchMemorials(q, page);
    rows = result.rows;
    total = result.total;
  } catch {
    error = 'Recherche indisponible pour le moment.';
  }

  const covers = await getCoverUrls(rows.map((r) => r.id));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Rechercher un mémorial
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Trouvez un mémorial par nom, prénom ou surnom.
      </p>

      <form method="get" action="/search" className="mt-6 flex flex-wrap gap-3 sm:flex-nowrap">
        <label htmlFor="q" className="sr-only">
          Nom, prénom ou surnom
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Nom, prénom ou surnom"
          autoComplete="off"
          className="flex-1"
          iconLeft={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          }
        />
        <Button type="submit" variant="primary" size="md">
          Rechercher
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {q && !error && (
        <p className="mt-6 text-sm text-muted-foreground tabular">
          {total} résultat{total > 1 ? 's' : ''} pour « {q} »
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m, i) => {
          const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
          return (
            <li
              key={m.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
            >
              <MemorialCard
                slug={m.slug}
                fullName={fullName}
                nickname={m.nickname}
                birthDate={m.birthDate}
                deathDate={m.deathDate}
                coverUrl={covers.get(m.id) ?? null}
              />
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className={buttonClasses({
                variant: 'secondary',
                styleVariant: 'outline',
                size: 'sm',
              })}
            >
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className={buttonClasses({
                variant: 'secondary',
                styleVariant: 'outline',
                size: 'sm',
              })}
            >
              Suivant →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

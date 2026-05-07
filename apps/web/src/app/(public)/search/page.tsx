import Link from 'next/link';
import type { Metadata } from 'next';
import { getSupabaseServer } from '@/lib/supabase/server';

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Rechercher un mémorial</h1>
      <form method="get" action="/search" className="mt-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Nom, prénom ou surnom
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Nom, prénom ou surnom"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2"
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Rechercher
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      {q && !error && (
        <p className="mt-6 text-sm text-muted-foreground">
          {total} résultat{total > 1 ? 's' : ''} pour « {q} »
        </p>
      )}

      <ul className="mt-4 divide-y divide-border">
        {rows.map((m) => {
          const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
          return (
            <li key={m.id} className="py-4">
              <Link
                href={`/memorial/${m.slug}`}
                className="block rounded-md px-2 py-1 hover:bg-muted/50"
              >
                <p className="font-medium">{fullName}</p>
                {m.nickname && (
                  <p className="text-sm text-muted-foreground">« {m.nickname} »</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatDateRange(m.birthDate, m.deathDate)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
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

function formatDateRange(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '?');
  if (!birth && !death) return '';
  return `${fmt(birth)} — ${fmt(death)}`;
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { MemorialCard } from '@/components/MemorialCard';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  robots: { index: false, follow: false },
};

interface OwnedMemorialRow {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  birthDate: string | null;
  deathDate: string | null;
  isPublic: boolean;
  createdAt: string;
}

async function getOwnedMemorials(ownerId: string): Promise<OwnedMemorialRow[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, birthDate, deathDate, isPublic, createdAt')
    .eq('ownerId', ownerId)
    .order('createdAt', { ascending: false })
    .returns<OwnedMemorialRow[]>();
  return data ?? [];
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const memorials = await getOwnedMemorials(user.id);
  const covers = await getCoverUrls(memorials.map((m) => m.id));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Mes mémoriels</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Créer un mémorial
        </Link>
      </div>

      {memorials.length === 0 ? (
        <p className="mt-8 rounded-md border border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Vous n'avez pas encore créé de mémorial.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memorials.map((m) => {
            const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
            return (
              <li key={m.id}>
                <MemorialCard
                  slug={m.slug}
                  fullName={fullName}
                  birthDate={m.birthDate}
                  deathDate={m.deathDate}
                  coverUrl={covers.get(m.id) ?? null}
                  badge={m.isPublic ? null : 'Privé'}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

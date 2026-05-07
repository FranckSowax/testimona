import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';

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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const memorials = await getOwnedMemorials(user.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Mes mémoriels</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Créer un mémorial
        </Link>
      </div>

      {memorials.length === 0 ? (
        <p className="mt-8 rounded-md border border-border bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Vous n'avez pas encore créé de mémorial.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-md border border-border">
          {memorials.map((m) => {
            const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
            return (
              <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateRange(m.birthDate, m.deathDate)}
                    {' · '}
                    {m.isPublic ? 'Public' : 'Privé'}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/memorial/${m.slug}`}
                    className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/dashboard/memorial/${m.id}`}
                    className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
                  >
                    Gérer
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDateRange(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '?');
  if (!birth && !death) return '';
  return `${fmt(birth)} — ${fmt(death)}`;
}

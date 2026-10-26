import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/Avatar';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { ButtonText } from '@/components/ui/ButtonText';
import { MemorialListItem } from '@/components/ui/MemorialListItem';

export const revalidate = 60;

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  birthDate: string | null;
  deathDate: string | null;
}

async function fetchOwnedMemorials(userId: string): Promise<MemorialLite[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, birthDate, deathDate')
    .eq('ownerId', userId)
    .eq('isPublic', true)
    .order('createdAt', { ascending: false })
    .returns<MemorialLite[]>();
  return data ?? [];
}

async function fetchTestimonialMemorials(userId: string): Promise<MemorialLite[]> {
  const supabase = await getSupabaseServer();
  const { data: rows } = await supabase
    .from('Testimonial')
    .select('memorialId')
    .eq('authorId', userId);
  const ids = Array.from(new Set((rows ?? []).map((r: { memorialId: string }) => r.memorialId)));
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, birthDate, deathDate')
    .in('id', ids)
    .eq('isPublic', true)
    .returns<MemorialLite[]>();
  return data ?? [];
}

async function userExists(userId: string): Promise<boolean> {
  const supabase = await getSupabaseServer();
  const owned = await supabase
    .from('Memorial')
    .select('ownerId', { count: 'exact', head: true })
    .eq('ownerId', userId);
  if ((owned.count ?? 0) > 0) return true;

  const authored = await supabase
    .from('Testimonial')
    .select('authorId', { count: 'exact', head: true })
    .eq('authorId', userId);
  return (authored.count ?? 0) > 0;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `User ${id.slice(0, 8)} profile`, robots: { index: false, follow: false } };
}

function fmtYears(birth: string | null, death: string | null): string {
  const year = (d: string | null) => (d ? new Date(d).getFullYear().toString() : '?');
  if (!birth && !death) return '';
  return `${year(birth)} – ${year(death)}`;
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await userExists(id))) notFound();

  const [owned, viaTestimonials] = await Promise.all([
    fetchOwnedMemorials(id),
    fetchTestimonialMemorials(id),
  ]);

  const shortId = id.slice(0, 8);
  const userLabel = `User ${shortId}`;

  return (
    <article className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: `${userLabel} profile` }]}
        className="mb-4"
      />

      <section
        aria-label="Profile"
        className="border-border flex items-start gap-5 rounded-lg border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <Avatar size="xl" border="rose" name={userLabel} />
        <div className="flex-1">
          <h1 className="font-display text-foreground text-2xl font-bold">{userLabel}</h1>
          <p className="text-muted-foreground text-sm italic">Member of the Testimona community</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ButtonIcon label="Edit" size="md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </ButtonIcon>
          <ButtonIcon label="Contact" size="md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 4h16v16H4z" />
              <path d="M4 4l8 8 8-8" />
            </svg>
          </ButtonIcon>
        </div>
      </section>

      <div className="mt-3 text-right">
        <ButtonText variant="action" type="button">
          Report
        </ButtonText>
      </div>

      <section className="mt-10 space-y-4" aria-label="Memorials administered">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-foreground text-base font-bold">
            Memorials administered ({owned.length})
          </h2>
          <ButtonText variant="filter" type="button">
            Recent
          </ButtonText>
        </header>
        {owned.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            This user does not administer any public memorial yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {owned.map((m) => {
              const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
              return (
                <MemorialListItem
                  key={m.id}
                  href={`/memorial/${m.slug}`}
                  fullName={fullName}
                  meta={fmtYears(m.birthDate, m.deathDate)}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 space-y-4" aria-label="Memorials testified on">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-foreground text-base font-bold">
            Testified on ({viaTestimonials.length})
          </h2>
          <ButtonText variant="filter" type="button">
            Recent
          </ButtonText>
        </header>
        {viaTestimonials.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No public testimonials yet.</p>
        ) : (
          <ul className="space-y-1">
            {viaTestimonials.map((m) => {
              const fullName = [m.firstname, m.lastname].filter(Boolean).join(' ');
              return (
                <MemorialListItem
                  key={m.id}
                  href={`/memorial/${m.slug}`}
                  fullName={fullName}
                  meta={fmtYears(m.birthDate, m.deathDate)}
                />
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}

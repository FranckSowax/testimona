import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseServer } from '@/lib/supabase/server';
import { TestimonialsSection } from './_components/TestimonialsSection';
import { PhotosSection } from './_components/PhotosSection';
import { BiographySection } from './_components/BiographySection';
import { DonateSection } from './_components/DonateSection';

export const revalidate = 60; // ISR — 60s

interface MemorialRow {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
  description: string | null;
  isPublic: boolean;
}

async function getMemorial(slug: string): Promise<MemorialRow | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname, nickname, birthDate, deathDate, description, isPublic')
    .eq('slug', slug)
    .eq('isPublic', true)
    .maybeSingle<MemorialRow>();
  return data ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const memorial = await getMemorial(slug);
  if (!memorial) return { title: 'Mémorial introuvable' };

  const fullName = [memorial.firstname, memorial.nickname && `« ${memorial.nickname} »`, memorial.lastname]
    .filter(Boolean)
    .join(' ');

  return {
    title: `${fullName}`,
    description: memorial.description?.slice(0, 160) ?? `Mémorial de ${fullName}`,
    openGraph: {
      title: fullName,
      description: memorial.description?.slice(0, 160),
      type: 'profile',
    },
  };
}

export default async function MemorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const memorial = await getMemorial(slug);
  if (!memorial) notFound();

  const fullName = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">{fullName}</h1>
        {memorial.nickname && (
          <p className="mt-1 text-lg text-muted-foreground">« {memorial.nickname} »</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDateRange(memorial.birthDate, memorial.deathDate)}
        </p>
      </header>
      {memorial.description && (
        <section className="mt-8 whitespace-pre-line text-base leading-relaxed">
          {memorial.description}
        </section>
      )}
      <BiographySection memorialId={memorial.id} />
      <PhotosSection memorialId={memorial.id} />
      <TestimonialsSection memorialId={memorial.id} slug={memorial.slug} />
      <DonateSection memorialId={memorial.id} slug={memorial.slug} />
    </article>
  );
}

function formatDateRange(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '?');
  if (!birth && !death) return '';
  return `${fmt(birth)} — ${fmt(death)}`;
}

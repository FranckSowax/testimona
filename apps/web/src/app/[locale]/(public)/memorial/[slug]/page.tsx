import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { TestimonialsSection } from './_components/TestimonialsSection';
import { PhotosSection } from './_components/PhotosSection';
import { BiographySection } from './_components/BiographySection';
import { DonateSection } from './_components/DonateSection';
import { FuneralSection } from './_components/FuneralSection';
import { MemorialTabs } from './_components/MemorialTabs';

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

async function getCoverPhotoUrl(memorialId: string): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('url')
    .eq('memorialId', memorialId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle<{ url: string }>();
  return data?.url ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const memorial = await getMemorial(slug);
  if (!memorial) return { title: 'Mémorial introuvable' };

  const fullName = [
    memorial.firstname,
    memorial.nickname && `« ${memorial.nickname} »`,
    memorial.lastname,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: fullName,
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
  const coverUrl = await getCoverPhotoUrl(memorial.id);
  const tTabs = await getTranslations('tabs');

  return (
    <article>
      <header className="relative h-[40vh] min-h-[280px] w-full overflow-hidden bg-secondary">
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill sizes="100vw" priority className="object-cover" />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(45,50,80,0.25) 0%, rgba(45,50,80,0.75) 75%, rgba(45,50,80,0.92) 100%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-6 pb-10 text-white">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {fullName}
          </h1>
          {memorial.nickname && (
            <p className="mt-1 text-lg italic opacity-90">« {memorial.nickname} »</p>
          )}
          <p className="mt-2 text-sm font-medium uppercase tracking-wide opacity-80">
            {formatDateRange(memorial.birthDate, memorial.deathDate)}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pb-16 pt-8">
        {memorial.description && (
          <section
            aria-label="À propos"
            className="whitespace-pre-line border-l-4 border-primary bg-surface px-6 py-5 text-base leading-relaxed"
          >
            {memorial.description}
          </section>
        )}

        <MemorialTabs
          tabs={[
            {
              id: 'testimonials',
              label: tTabs('testimonials'),
              panel: <TestimonialsSection memorialId={memorial.id} slug={memorial.slug} />,
            },
            {
              id: 'photos',
              label: tTabs('photos'),
              panel: <PhotosSection memorialId={memorial.id} />,
            },
            {
              id: 'donate',
              label: tTabs('donation'),
              panel: <DonateSection memorialId={memorial.id} slug={memorial.slug} />,
            },
            {
              id: 'life-details',
              label: tTabs('lifeDetails'),
              panel: <BiographySection memorialId={memorial.id} />,
            },
            {
              id: 'funeral',
              label: tTabs('funeral'),
              panel: <FuneralSection memorialId={memorial.id} />,
            },
          ]}
        />
      </div>
    </article>
  );
}

function formatDateRange(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '?');
  if (!birth && !death) return '';
  return `${fmt(birth)} — ${fmt(death)}`;
}

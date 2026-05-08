import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { TestimonialsSection } from './_components/TestimonialsSection';
import { PhotosSection } from './_components/PhotosSection';
import { BiographySection } from './_components/BiographySection';
import { DonateSection } from './_components/DonateSection';
import { FuneralSection } from './_components/FuneralSection';
import { MemorialTabs } from './_components/MemorialTabs';
import { ShareButtons } from '@/components/ShareButtons';
import { MemorialHeaderCard } from '@/components/ui/MemorialHeaderCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ButtonText } from '@/components/ui/ButtonText';

export const revalidate = 60; // ISR — 60s

interface MemorialRow {
  id: string;
  slug: string;
  ownerId: string;
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
    .select(
      'id, slug, ownerId, firstname, lastname, nickname, birthDate, deathDate, description, isPublic',
    )
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
  const [coverUrl, tTabs, currentUser] = await Promise.all([
    getCoverPhotoUrl(memorial.id),
    getTranslations('tabs'),
    getCurrentUser(),
  ]);
  const isOwner = currentUser?.id === memorial.ownerId;

  const yearLine = formatYearLine(memorial.birthDate, memorial.deathDate);
  const birthLine = memorial.birthDate
    ? new Date(memorial.birthDate).toLocaleDateString('fr-FR')
    : undefined;
  const deathLine = memorial.deathDate
    ? new Date(memorial.deathDate).toLocaleDateString('fr-FR')
    : undefined;

  return (
    <article className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: `${fullName} Memorial` },
        ]}
        className="mb-4"
      />

      <MemorialHeaderCard
        fullName={fullName}
        yearLine={yearLine}
        nickname={memorial.nickname}
        bio={memorial.description}
        birthLine={birthLine}
        deathLine={deathLine}
        coverUrl={coverUrl}
        avatarUrl={coverUrl}
        adminBadge={
          isOwner ? (
            <span>This page is administered by you</span>
          ) : (
            <span>
              This page is administered by the family ·{' '}
              <ButtonText
                variant="action"
                type="button"
                className="!inline-flex"
              >
                Be an admin
              </ButtonText>
            </span>
          )
        }
        bioActions={
          <ShareButtons
            url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/memorial/${memorial.slug}`}
            title={`Mémorial de ${fullName}`}
          />
        }
      />

      <div className="mt-8">
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
              panel: (
                <PhotosSection
                  memorialId={memorial.id}
                  slug={memorial.slug}
                  isOwner={isOwner}
                />
              ),
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

function formatYearLine(birth: string | null, death: string | null): string {
  const year = (d: string | null) => (d ? new Date(d).getFullYear().toString() : '?');
  if (!birth && !death) return '';
  return `${year(birth)} – ${year(death)}`;
}

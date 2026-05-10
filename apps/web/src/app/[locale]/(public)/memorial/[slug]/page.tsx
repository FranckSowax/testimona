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
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { AppSidebar } from '@/components/AppSidebar';
import { MemorialEditModalShell } from './_components/MemorialEditModalShell';
import { AdminRequestModalShell } from './_components/AdminModalShells';

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

  const memorialContent = (
    <>
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
          <span>
            This page is administered by{' '}
            <span className="font-display font-bold not-italic text-foreground">
              {isOwner ? 'you' : 'User 1'}
            </span>
          </span>
        }
        adminAction={
          isOwner ? (
            <MemorialEditModalShell
              memorialId={memorial.id}
              slug={memorial.slug}
              initial={{
                firstname: memorial.firstname,
                lastname: memorial.lastname,
                birthYear: memorial.birthDate
                  ? String(new Date(memorial.birthDate).getFullYear())
                  : '',
                deathYear: memorial.deathDate
                  ? String(new Date(memorial.deathDate).getFullYear())
                  : '',
                deathCountry: '',
                relationship: '',
                bio: memorial.description ?? '',
              }}
            />
          ) : currentUser ? (
            <AdminRequestModalShell memorialId={memorial.id} slug={memorial.slug} />
          ) : (
            <ButtonText variant="action" type="button">
              Be an admin
            </ButtonText>
          )
        }
        sideActions={
          <>
            <ButtonIcon label="Play diaporama" tone="default" size="sm" className="!bg-white/20 !text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </ButtonIcon>
            <ButtonIcon label="Edit" tone="default" size="sm" className="!bg-white/20 !text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </ButtonIcon>
            <ButtonIcon label="Like" tone="default" size="sm" className="!bg-white/20 !text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </ButtonIcon>
            <ButtonIcon label="Share" tone="default" size="sm" className="!bg-white/20 !text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </ButtonIcon>
            <ButtonIcon label="Contact" tone="default" size="sm" className="!bg-white/20 !text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16v16H4z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </ButtonIcon>
          </>
        }
        bioActions={
          <>
            <ShareButtons
              url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/memorial/${memorial.slug}`}
              title={`Mémorial de ${fullName}`}
            />
            <ButtonText variant="action" type="button">
              Report
            </ButtonText>
          </>
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
              panel: (
                <BiographySection
                  memorialId={memorial.id}
                  slug={memorial.slug}
                  isOwner={isOwner}
                />
              ),
            },
            {
              id: 'funeral',
              label: tTabs('funeral'),
              panel: (
                <FuneralSection
                  memorialId={memorial.id}
                  slug={memorial.slug}
                  isOwner={isOwner}
                />
              ),
            },
          ]}
        />
      </div>
    </>
  );

  // Layout : 2-col with AppSidebar left when logged in, single col anonymous.
  if (currentUser) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AppSidebar />
            </div>
          </aside>
          <main className="min-w-0">{memorialContent}</main>
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      {memorialContent}
    </article>
  );
}

function formatYearLine(birth: string | null, death: string | null): string {
  const year = (d: string | null) => (d ? new Date(d).getFullYear().toString() : '?');
  if (!birth && !death) return '';
  return `${year(birth)} – ${year(death)}`;
}

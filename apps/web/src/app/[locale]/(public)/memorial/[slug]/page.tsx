import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { canManageMemorial } from '@/lib/memorial/access';
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
import { MemorialCoverSidebar } from './_components/MemorialCoverSidebar';
import { MemorialMembersSection } from './_components/MemorialMembersSection';
import { TiltCard } from '@/components/motion/TiltCard';
import { AnimateMemorialModal } from './_components/AnimateMemorialModal';
import { ShopSection } from './_components/ShopSection';
import { getBalance } from '@/lib/credits/balance';

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
  musicUrl: string | null;
}

async function getMemorial(slug: string): Promise<MemorialRow | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select(
      'id, slug, ownerId, firstname, lastname, nickname, birthDate, deathDate, description, isPublic, musicUrl',
    )
    .eq('slug', slug)
    .eq('isPublic', true)
    .maybeSingle<MemorialRow>();
  return data ?? null;
}

async function getCoverPhotoUrl(memorialId: string): Promise<string | null> {
  const supabase = await getSupabaseServer();

  // Owner-chosen cover (Memorial.coverPhotoId). Tolerate the column not
  // existing yet (migration v18 not applied) — supabase-js returns an error,
  // not a throw, so `data` is null and we fall back to the first photo.
  const { data: mem } = await supabase
    .from('Memorial')
    .select('coverPhotoId')
    .eq('id', memorialId)
    .maybeSingle<{ coverPhotoId: string | null }>();
  const coverPhotoId = mem?.coverPhotoId ?? null;

  // Owner-chosen cover wins, as long as it still exists and is approved.
  if (coverPhotoId) {
    const { data: chosen } = await supabase
      .from('Photo')
      .select('url')
      .eq('id', coverPhotoId)
      .eq('memorialId', memorialId)
      .eq('status', 'approved')
      .maybeSingle<{ url: string }>();
    if (chosen?.url) return chosen.url;
  }

  // Fallback: first approved photo by position.
  const { data } = await supabase
    .from('Photo')
    .select('url')
    .eq('memorialId', memorialId)
    .eq('status', 'approved')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle<{ url: string }>();
  return data?.url ?? null;
}

async function getMemorialPhotos(memorialId: string): Promise<
  { id: string; url: string; caption: string | null; durationMs: number | null }[]
> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Photo')
    .select('id, url, caption, durationMs')
    .eq('memorialId', memorialId)
    .order('position', { ascending: true })
    .returns<
      { id: string; url: string; caption: string | null; durationMs: number | null }[]
    >();
  return data ?? [];
}

interface ReadyClipRow {
  photoId: string;
  videoUrl: string | null;
  caption: string | null;
  durationMs: number | null;
}

async function getReadyClipsByPhoto(memorialId: string): Promise<
  Map<string, ReadyClipRow>
> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('MemorialClip')
    .select('photoId, videoUrl, caption, durationMs')
    .eq('memorialId', memorialId)
    .eq('status', 'ready')
    .not('validatedAt', 'is', null)
    .order('createdAt', { ascending: false })
    .returns<ReadyClipRow[]>();
  // Keep most-recent validated clip per photo
  const map = new Map<string, ReadyClipRow>();
  for (const c of data ?? []) {
    if (!map.has(c.photoId)) map.set(c.photoId, c);
  }
  return map;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const memorial = await getMemorial(slug);
  if (!memorial) return { title: 'Mémorial introuvable', robots: { index: false } };

  const fullName = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');
  const displayName = memorial.nickname
    ? `${fullName} « ${memorial.nickname} »`
    : fullName;
  const yearLine = (() => {
    const birth = memorial.birthDate ? new Date(memorial.birthDate).getFullYear() : null;
    const death = memorial.deathDate ? new Date(memorial.deathDate).getFullYear() : null;
    if (birth && death) return `${birth} – ${death}`;
    if (death) return `${death}`;
    return '';
  })();

  const title = yearLine ? `${displayName}, ${yearLine}` : displayName;
  const description =
    memorial.description?.slice(0, 200) ??
    (locale === 'en'
      ? `In memory of ${fullName}. Share testimonials, photos and tributes.`
      : `En mémoire de ${fullName}. Partagez témoignages, photos et hommages.`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://testimona.com';
  const canonical = `${siteUrl}/${locale}/memorial/${slug}`;
  const ogImage = `${siteUrl}/api/og/memorial/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title,
      description,
      siteName: 'Testimona',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: displayName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

async function getMemorialPlaces(memorialId: string): Promise<{
  birthCountry: string | null;
  birthCity: string | null;
  deathCountry: string | null;
  deathCity: string | null;
}> {
  const supabase = await getSupabaseServer();
  // Tolerant: if migration v19 hasn't run, the columns don't exist and
  // supabase-js returns an error (not a throw) → data is null → no places.
  const { data } = await supabase
    .from('Memorial')
    .select('birthCountry, birthCity, deathCountry, deathCity')
    .eq('id', memorialId)
    .maybeSingle<{
      birthCountry: string | null;
      birthCity: string | null;
      deathCountry: string | null;
      deathCity: string | null;
    }>();
  return (
    data ?? {
      birthCountry: null,
      birthCity: null,
      deathCountry: null,
      deathCity: null,
    }
  );
}

export default async function MemorialPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const memorial = await getMemorial(slug);
  if (!memorial) notFound();

  const fullName = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');
  const [coverUrl, memorialPhotos, readyClipsByPhoto, tTabs, tBadge, tCover, currentUser] = await Promise.all([
    getCoverPhotoUrl(memorial.id),
    getMemorialPhotos(memorial.id),
    getReadyClipsByPhoto(memorial.id),
    getTranslations('tabs'),
    getTranslations('memorial.adminBadge'),
    getTranslations('memorial.coverSidebar'),
    getCurrentUser(),
  ]);
  // Merge ready Higgsfield clips into the photo list. The viewer reads
  // videoUrl + caption when present and falls back to the still image.
  const storyPhotos = memorialPhotos.map((p) => {
    const clip = readyClipsByPhoto.get(p.id);
    return {
      id: p.id,
      url: p.url,
      caption: clip?.caption ?? p.caption,
      durationMs: clip?.durationMs ?? p.durationMs ?? null,
      videoUrl: clip?.videoUrl ?? null,
    };
  });
  // Owner-only payloads: testimonials list + credit balance for the
  // Animate-via-Higgsfield wizard. Skip the queries for anon visitors.
  // G3 — owner OR accepted co-owner sees the management tools.
  const isOwnerEarly = await canManageMemorial(memorial.id, currentUser?.id);
  const [animateTestimonials, ownerBalance] = isOwnerEarly
    ? await Promise.all([
        (async () => {
          const sb = await getSupabaseServer();
          const { data } = await sb
            .from('Testimonial')
            .select('id, authorName, message')
            .eq('memorialId', memorial.id)
            .order('createdAt', { ascending: false })
            .limit(50)
            .returns<{ id: string; authorName: string; message: string }[]>();
          return data ?? [];
        })(),
        getBalance(currentUser!.id),
      ])
    : [[], 0];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const shareUrl = `${siteUrl}/memorial/${memorial.slug}`;
  const coverLabels = {
    play: tCover('play'),
    edit: tCover('edit'),
    like: tCover('like'),
    liked: tCover('liked'),
    share: tCover('share'),
    writeTestimonial: tCover('writeTestimonial'),
    signinToWrite: tCover('signinToWrite'),
    story: {
      aria: tCover('story.aria'),
      close: tCover('story.close'),
      prev: tCover('story.prev'),
      next: tCover('story.next'),
      play: tCover('story.play'),
      pause: tCover('story.pause'),
      filterNone: tCover('story.filterNone'),
      filterBw: tCover('story.filterBw'),
      filterSepia: tCover('story.filterSepia'),
      kenBurns: tCover('story.kenBurns'),
      vignette: tCover('story.vignette'),
      bokeh: tCover('story.bokeh'),
      swipe: tCover('story.swipe'),
      fade: tCover('story.fade'),
      musicOn: tCover('story.musicOn'),
      musicOff: tCover('story.musicOff'),
      empty: tCover('story.empty'),
      speed: tCover('story.speed'),
      speedSlow: tCover('story.speedSlow'),
      speedMedium: tCover('story.speedMedium'),
      speedFast: tCover('story.speedFast'),
    },
    shareDialog: {
      aria: tCover('shareDialog.aria'),
      heading: tCover('shareDialog.heading'),
      copy: tCover('shareDialog.copy'),
      copied: tCover('shareDialog.copied'),
      close: tCover('shareDialog.close'),
      nativeShare: tCover('shareDialog.nativeShare'),
      facebook: tCover('shareDialog.facebook'),
      twitter: tCover('shareDialog.twitter'),
      whatsapp: tCover('shareDialog.whatsapp'),
      linkedin: tCover('shareDialog.linkedin'),
      email: tCover('shareDialog.email'),
    },
  };
  const isOwner = isOwnerEarly;

  const places = await getMemorialPlaces(memorial.id);
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  const birthPlace = [places.birthCity, places.birthCountry].filter(Boolean).join(', ');
  const deathPlace = [places.deathCity, places.deathCountry].filter(Boolean).join(', ');

  const yearLine = formatYearLine(memorial.birthDate, memorial.deathDate, locale);
  const birthLine =
    [
      memorial.birthDate
        ? new Date(memorial.birthDate).toLocaleDateString(dateLocale)
        : '',
      birthPlace,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;
  const deathLine =
    [
      memorial.deathDate
        ? new Date(memorial.deathDate).toLocaleDateString(dateLocale)
        : '',
      deathPlace,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  const memorialContent = (
    <>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: `${fullName} Memorial` },
        ]}
        className="mb-4"
      />

      <TiltCard>
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
            {tBadge('administeredBy')}{' '}
            <span className="font-display font-bold not-italic text-foreground">
              {isOwner ? tBadge('you') : tBadge('family')}
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
                musicUrl: memorial.musicUrl ?? '',
              }}
            />
          ) : currentUser ? (
            <AdminRequestModalShell memorialId={memorial.id} slug={memorial.slug} />
          ) : null
        }
        sideActions={
          <MemorialCoverSidebar
            slug={memorial.slug}
            fullName={fullName}
            shareUrl={shareUrl}
            photos={storyPhotos}
            musicUrl={memorial.musicUrl}
            isOwner={isOwner}
            isLoggedIn={!!currentUser}
            labels={coverLabels}
          />
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
      </TiltCard>

      {isOwner && (
        <AnimateMemorialModal
          memorialId={memorial.id}
          memorialName={fullName}
          photos={memorialPhotos.map((p) => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
          }))}
          testimonials={animateTestimonials}
          initialBalance={ownerBalance}
        />
      )}

      {isOwner && (
        <MemorialMembersSection memorialId={memorial.id} slug={memorial.slug} />
      )}

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
              panel: (
                <DonateSection
                  memorialId={memorial.id}
                  slug={memorial.slug}
                  isOwner={isOwner}
                />
              ),
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
            // Boutique placée en dernier onglet (recette PDF p22).
            {
              id: 'shop',
              label: 'Boutique',
              panel: (
                <ShopSection
                  memorialId={memorial.id}
                  memorialName={fullName}
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

function formatYearLine(
  birth: string | null,
  death: string | null,
  locale: string,
): string {
  const year = (d: string | null) => (d ? new Date(d).getFullYear().toString() : '?');
  if (!birth && !death) return '';
  const base = `${year(birth)} – ${year(death)}`;
  // PDF p19 — show the age at death so the right person is identified even
  // when there is no photo.
  const age = computeAge(birth, death);
  if (age == null) return base;
  const ageStr =
    locale === 'en' ? `at the age of ${age}` : `à l'âge de ${age} ans`;
  return `${base} · ${ageStr}`;
}

/** Age in full years between birth and death dates (null if either is missing). */
function computeAge(birth: string | null, death: string | null): number | null {
  if (!birth || !death) return null;
  const b = new Date(birth);
  const d = new Date(death);
  if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
  let age = d.getFullYear() - b.getFullYear();
  const monthDiff = d.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && d.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

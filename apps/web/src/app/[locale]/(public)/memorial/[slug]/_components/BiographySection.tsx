import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ChapterCreateModalShell } from './ChapterCreateModalShell';
import { BiographyInfoCard, type BiographyInfo } from './BiographyInfoCard';
import { BiographyChaptersManager } from './BiographyChaptersManager';
import { ChapterMediaGrid, type ChapterMedia } from './ChapterMediaGrid';

interface ChapterRow {
  id: string;
  title: string;
  content: string;
  position: number;
  media: ChapterMedia[];
}

interface BiographyRow extends BiographyInfo {
  id: string;
}

async function getBiographyData(
  memorialId: string,
): Promise<{ bio: BiographyInfo | null; chapters: ChapterRow[] }> {
  const supabase = await getSupabaseServer();
  const { data: bio } = await supabase
    .from('Biography')
    .select(
      'id, username, homeCity, placesLived, relatives, religion, education, work, hobby, socialLinks',
    )
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();
  if (!bio) return { bio: null, chapters: [] };

  // Try to include media; if migration v20 hasn't run the column doesn't exist
  // and supabase-js returns an error — fall back to the media-less select so the
  // chapters still render.
  const withMedia = await supabase
    .from('Chapter')
    .select('id, title, content, position, media')
    .eq('biographyId', bio.id)
    .order('position', { ascending: true })
    .returns<ChapterRow[]>();
  let chapters: ChapterRow[];
  if (withMedia.error) {
    const { data } = await supabase
      .from('Chapter')
      .select('id, title, content, position')
      .eq('biographyId', bio.id)
      .order('position', { ascending: true })
      .returns<Omit<ChapterRow, 'media'>[]>();
    chapters = (data ?? []).map((c) => ({ ...c, media: [] }));
  } else {
    chapters = (withMedia.data ?? []).map((c) => ({ ...c, media: c.media ?? [] }));
  }

  const { id: _id, ...info } = bio;
  return { bio: info, chapters };
}

export async function BiographySection({
  memorialId,
  slug,
  isOwner = false,
}: {
  memorialId: string;
  slug?: string;
  isOwner?: boolean;
}) {
  const [{ bio, chapters }, t] = await Promise.all([
    getBiographyData(memorialId),
    getTranslations('memorial.biographySection'),
  ]);

  const hasInfo = bio
    ? Object.values(bio).some((v) => v != null && String(v).trim() !== '')
    : false;

  return (
    <section aria-labelledby="biography-heading" className="space-y-6">
      <header className="sr-only">
        <h2 id="biography-heading">{t('heading')}</h2>
      </header>

      {/* PDF p35 — « Add a life chapter » doit être placé en haut. */}
      {isOwner && slug && (
        <div className="flex justify-center">
          <ChapterCreateModalShell memorialId={memorialId} slug={slug} />
        </div>
      )}

      {(hasInfo || isOwner) && slug && (
        <BiographyInfoCard memorialId={memorialId} slug={slug} bio={bio} isOwner={isOwner} />
      )}

      {chapters.length > 0 && isOwner && slug && (
        <BiographyChaptersManager memorialId={memorialId} slug={slug} initialChapters={chapters} />
      )}

      {chapters.length > 0 && !isOwner && (
        <div className="space-y-8">
          {chapters.map((c) => (
            <article
              key={c.id}
              className="border-border rounded-lg border bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="font-display text-foreground text-lg font-bold">{c.title}</h3>
              <div className="text-foreground/90 mt-2 whitespace-pre-line text-base leading-relaxed">
                {c.content}
              </div>
              <ChapterMediaGrid media={c.media} />
            </article>
          ))}
        </div>
      )}

      {chapters.length === 0 && !hasInfo && !isOwner && (
        <p className="text-muted-foreground text-sm italic">{t('emptyPublic')}</p>
      )}
    </section>
  );
}

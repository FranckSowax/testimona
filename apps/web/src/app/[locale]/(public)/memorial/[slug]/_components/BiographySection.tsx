import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ChapterCreateModalShell } from './ChapterCreateModalShell';
import { BiographyInfoCard, type BiographyInfo } from './BiographyInfoCard';
import { BiographyChaptersManager } from './BiographyChaptersManager';

interface ChapterRow {
  id: string;
  title: string;
  content: string;
  position: number;
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
      'id, username, homeCity, placesLived, relatives, religion, education, work, hobby',
    )
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();
  if (!bio) return { bio: null, chapters: [] };

  const { data: chapters } = await supabase
    .from('Chapter')
    .select('id, title, content, position')
    .eq('biographyId', bio.id)
    .order('position', { ascending: true })
    .returns<ChapterRow[]>();

  const { id: _id, ...info } = bio;
  return { bio: info, chapters: chapters ?? [] };
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

      {(hasInfo || isOwner) && slug && (
        <BiographyInfoCard
          memorialId={memorialId}
          slug={slug}
          bio={bio}
          isOwner={isOwner}
        />
      )}

      {chapters.length > 0 && isOwner && slug && (
        <BiographyChaptersManager
          memorialId={memorialId}
          slug={slug}
          initialChapters={chapters}
        />
      )}

      {chapters.length > 0 && !isOwner && (
        <div className="space-y-8">
          {chapters.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="font-display text-lg font-bold text-foreground">{c.title}</h3>
              <div className="mt-2 whitespace-pre-line text-base leading-relaxed text-foreground/90">
                {c.content}
              </div>
            </article>
          ))}
        </div>
      )}

      {chapters.length === 0 && !hasInfo && !isOwner && (
        <p className="text-sm italic text-muted-foreground">
          Les proches publieront bientôt les chapitres de vie.
        </p>
      )}

      {isOwner && slug && (
        <div className="flex justify-center pt-4">
          <ChapterCreateModalShell memorialId={memorialId} slug={slug} />
        </div>
      )}
    </section>
  );
}

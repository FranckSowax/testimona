import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ChapterCreateModalShell } from './ChapterCreateModalShell';

interface ChapterRow {
  id: string;
  title: string;
  content: string;
  position: number;
}

async function getBiographyChapters(memorialId: string): Promise<ChapterRow[]> {
  const supabase = await getSupabaseServer();
  const { data: bio } = await supabase
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();
  if (!bio) return [];

  const { data: chapters } = await supabase
    .from('Chapter')
    .select('id, title, content, position')
    .eq('biographyId', bio.id)
    .order('position', { ascending: true })
    .returns<ChapterRow[]>();
  return chapters ?? [];
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
  const [chapters, t] = await Promise.all([
    getBiographyChapters(memorialId),
    getTranslations('memorial.biographySection'),
  ]);

  return (
    <section aria-labelledby="biography-heading" className="space-y-6">
      <header>
        <h2
          id="biography-heading"
          className="font-display text-base font-bold text-foreground"
        >
          {t('heading')}
        </h2>
      </header>

      {chapters.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {isOwner
            ? 'Aucun chapitre encore. Ajoutez le premier ci-dessous.'
            : 'Les proches publieront bientôt les chapitres de vie.'}
        </p>
      ) : (
        <div className="space-y-8">
          {chapters.map((c) => (
            <article key={c.id}>
              <h3 className="font-display text-lg font-bold text-foreground">{c.title}</h3>
              <div className="mt-2 whitespace-pre-line text-base leading-relaxed text-foreground/90">
                {c.content}
              </div>
            </article>
          ))}
        </div>
      )}

      {isOwner && slug && (
        <div className="flex justify-center pt-4">
          <ChapterCreateModalShell memorialId={memorialId} slug={slug} />
        </div>
      )}
    </section>
  );
}

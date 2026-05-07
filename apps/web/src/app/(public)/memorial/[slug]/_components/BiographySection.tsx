import { getSupabaseServer } from '@/lib/supabase/server';

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

export async function BiographySection({ memorialId }: { memorialId: string }) {
  const chapters = await getBiographyChapters(memorialId);
  if (chapters.length === 0) return null;

  return (
    <section aria-labelledby="biography-heading" className="mt-12">
      <h2 id="biography-heading" className="text-2xl font-semibold">
        Biographie
      </h2>
      <div className="mt-4 space-y-8">
        {chapters.map((c) => (
          <article key={c.id}>
            <h3 className="text-xl font-medium">{c.title}</h3>
            <div className="mt-2 whitespace-pre-line text-base leading-relaxed">{c.content}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

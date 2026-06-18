import { getTranslations } from 'next-intl/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsplashAvatarFor } from '@/lib/avatars';
import { TestimonialBubble } from '@/components/ui/TestimonialBubble';
import { Reveal } from '@/components/motion/Reveal';

interface MemorialLite {
  id: string;
  slug: string;
  firstname: string;
  lastname: string;
}

interface FeedTestimonial {
  id: string;
  memorialId: string;
  authorName: string;
  relationship: string | null;
  message: string;
  createdAt: string;
}

async function getRecentPublicMemorials(): Promise<MemorialLite[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Memorial')
    .select('id, slug, firstname, lastname')
    .eq('isPublic', true)
    .order('createdAt', { ascending: false })
    .limit(200)
    .returns<MemorialLite[]>();
  return data ?? [];
}

async function getRecentTestimonials(memorialIds: string[]): Promise<FeedTestimonial[]> {
  if (memorialIds.length === 0) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('Testimonial')
    .select('id, memorialId, authorName, relationship, message, createdAt')
    .in('memorialId', memorialIds)
    .order('createdAt', { ascending: false })
    .limit(30)
    .returns<FeedTestimonial[]>();
  return data ?? [];
}

export async function HomeFeed() {
  const memorials = await getRecentPublicMemorials();
  const memorialMap = new Map(memorials.map((m) => [m.id, m]));
  const [items, t] = await Promise.all([
    getRecentTestimonials(memorials.map((m) => m.id)),
    getTranslations('home.feed'),
  ]);

  return (
    <section aria-labelledby="home-feed-heading" className="space-y-4">
      <header>
        <h2 id="home-feed-heading" className="font-display text-2xl font-semibold text-foreground">
          {t('title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          {t('emptyBody')}
        </p>
      ) : (
        <Reveal as="ul" className="space-y-4">
          {items.map((item, i) => {
            const memorial = memorialMap.get(item.memorialId);
            if (!memorial) return null;
            const fullName = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');
            return (
              <TestimonialBubble
                key={item.id}
                index={i}
                authorName={item.authorName}
                authorRelation={item.relationship}
                authorAvatarUrl={unsplashAvatarFor(item.authorName)}
                memorialName={fullName}
                memorialSlug={memorial.slug}
                message={item.message}
                createdAt={item.createdAt}
                testimonialId={item.id}
                publishedOnLabel={t('publishedOn')}
                viewMemorialLabel={t('viewMemorial')}
              />
            );
          })}
        </Reveal>
      )}
    </section>
  );
}

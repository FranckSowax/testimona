import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsplashAvatarFor } from '@/lib/avatars';
import { Avatar } from '@/components/ui/Avatar';

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
    .select('id, memorialId, authorName, message, createdAt')
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
        <ul className="space-y-4">
          {items.map((item, i) => {
            const memorial = memorialMap.get(item.memorialId);
            if (!memorial) return null;
            const fullName = [memorial.firstname, memorial.lastname].filter(Boolean).join(' ');
            return (
              <li
                key={item.id}
                className="animate-fade-in-up rounded-lg border border-border bg-white p-5 shadow-sm"
                style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={unsplashAvatarFor(item.authorName)}
                      name={item.authorName}
                      size="sm"
                    />
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">
                        {item.authorName}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('publishedOn')}{' '}
                        <Link
                          href={`/memorial/${memorial.slug}`}
                          className="font-display font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {fullName}
                        </Link>
                      </p>
                    </div>
                  </div>
                  <time
                    dateTime={item.createdAt}
                    className="tabular shrink-0 text-xs text-muted-foreground"
                  >
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </time>
                </header>
                <div className="relative mt-3 pl-9">
                  <Image
                    src="/images/quote-open.svg"
                    alt=""
                    width={22}
                    height={22}
                    className="absolute left-0 top-0 h-5 w-5 opacity-60"
                  />
                  <p className="line-clamp-4 whitespace-pre-line text-sm italic leading-relaxed text-foreground/90">
                    {item.message}
                  </p>
                </div>
                <footer className="mt-4 flex items-center justify-end border-t border-border pt-3 text-xs">
                  <Link
                    href={`/memorial/${memorial.slug}#testimonial-${item.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t('viewMemorial')} →
                  </Link>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

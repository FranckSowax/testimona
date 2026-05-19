import { cache } from 'react';
import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the number of recent (≤7 days) activity events on the current user's
 * memorials and testimonials. Used to render a badge in the sidebar/header.
 * Returns 0 when no user is logged in.
 *
 * Wrapped in React's cache() so calls from SiteHeader + AppSidebar in the
 * same render pass don't run the 6 Supabase queries twice. This was
 * responsible for ~600ms of dashboard latency on mobile.
 */
export const getUnseenNotificationsCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const supabase = await getSupabaseServer();

  const { data: ownedMemorials } = await supabase
    .from('Memorial')
    .select('id')
    .eq('ownerId', user.id)
    .returns<{ id: string }[]>();
  const ownedIds = (ownedMemorials ?? []).map((m) => m.id);

  const { data: myTestimonials } = await supabase
    .from('Testimonial')
    .select('id')
    .eq('authorId', user.id)
    .returns<{ id: string }[]>();
  const myTestimonialIds = (myTestimonials ?? []).map((t) => t.id);

  const [received, likes, comments, donations] = await Promise.all([
    ownedIds.length > 0
      ? supabase
          .from('Testimonial')
          .select('id', { count: 'exact', head: true })
          .in('memorialId', ownedIds)
          .neq('authorId', user.id)
          .gte('createdAt', since)
      : Promise.resolve({ count: 0 }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialLike')
          .select('userId', { count: 'exact', head: true })
          .in('testimonialId', myTestimonialIds)
          .neq('userId', user.id)
          .gte('createdAt', since)
      : Promise.resolve({ count: 0 }),
    myTestimonialIds.length > 0
      ? supabase
          .from('TestimonialComment')
          .select('id', { count: 'exact', head: true })
          .in('testimonialId', myTestimonialIds)
          .neq('authorId', user.id)
          .gte('createdAt', since)
      : Promise.resolve({ count: 0 }),
    ownedIds.length > 0
      ? supabase
          .from('Donation')
          .select('id', { count: 'exact', head: true })
          .in('memorialId', ownedIds)
          .eq('status', 'Succeeded')
          .gte('createdAt', since)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    (received.count ?? 0) +
    (likes.count ?? 0) +
    (comments.count ?? 0) +
    (donations.count ?? 0)
  );
});

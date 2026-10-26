import type { MetadataRoute } from 'next';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

const STATIC_PATHS: {
  path: string;
  priority: number;
  freq: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
  { path: '/', priority: 1.0, freq: 'weekly' },
  { path: '/search', priority: 0.8, freq: 'daily' },
  { path: '/about', priority: 0.6, freq: 'monthly' },
  { path: '/legal/terms', priority: 0.4, freq: 'yearly' },
  { path: '/legal/privacy', priority: 0.4, freq: 'yearly' },
  { path: '/legal/mentions', priority: 0.4, freq: 'yearly' },
  { path: '/login', priority: 0.3, freq: 'yearly' },
  { path: '/signup', priority: 0.3, freq: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    changeFrequency: entry.freq,
    priority: entry.priority,
    alternates: {
      languages: {
        fr: `${baseUrl}/fr${entry.path === '/' ? '' : entry.path}`,
        en: `${baseUrl}/en${entry.path === '/' ? '' : entry.path}`,
      },
    },
  }));

  // Service-role client so the sitemap reads every public memorial without
  // depending on an anon session. Static-only fallback if it's not configured.
  let memorialEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from('Memorial')
      .select('slug, updatedAt, createdAt')
      .eq('isPublic', true)
      .order('updatedAt', { ascending: false })
      .limit(50000);
    if (data) {
      memorialEntries = (
        data as { slug: string; updatedAt: string | null; createdAt: string | null }[]
      ).map((m) => ({
        url: `${baseUrl}/memorial/${m.slug}`,
        lastModified: m.updatedAt
          ? new Date(m.updatedAt)
          : m.createdAt
            ? new Date(m.createdAt)
            : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: {
            fr: `${baseUrl}/fr/memorial/${m.slug}`,
            en: `${baseUrl}/en/memorial/${m.slug}`,
          },
        },
      }));
    }
  } catch {
    // Supabase admin client not configured yet — keep static-only.
  }

  return [...staticEntries, ...memorialEntries];
}

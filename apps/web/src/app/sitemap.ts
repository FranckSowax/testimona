import type { MetadataRoute } from 'next';
import { getSupabaseServer } from '@/lib/supabase/server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/search`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/signup`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let memorialEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from('Memorial')
      .select('slug, updatedAt')
      .eq('isPublic', true)
      .limit(50000);
    if (data) {
      memorialEntries = data.map((m) => ({
        url: `${baseUrl}/memorial/${m.slug}`,
        lastModified: m.updatedAt ? new Date(m.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
    }
  } catch {
    // Supabase not configured yet — return only static entries
  }

  return [...staticEntries, ...memorialEntries];
}

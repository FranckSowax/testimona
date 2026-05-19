import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ClipsList, type ClipRowDto } from './ClipsList';

export const dynamic = 'force-dynamic';

interface RawClipRow {
  id: string;
  memorialId: string;
  photoId: string;
  caption: string | null;
  status: string;
  videoUrl: string | null;
  durationMs: number;
  errorMessage: string | null;
  creditCost: number;
  createdAt: string;
  Memorial: { slug: string; firstname: string; lastname: string } | null;
  Photo: { url: string } | null;
}

export default async function ClipsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/clips');

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('MemorialClip')
    .select(
      `id, memorialId, photoId, caption, status, videoUrl, durationMs,
       errorMessage, creditCost, createdAt,
       Memorial:Memorial!MemorialClip_memorialId_fkey(slug, firstname, lastname),
       Photo:Photo!MemorialClip_photoId_fkey(url)`,
    )
    .eq('createdById', user.id)
    .order('createdAt', { ascending: false })
    .limit(80)
    .returns<RawClipRow[]>();

  const clips: ClipRowDto[] = (data ?? []).map((c) => ({
    id: c.id,
    memorialId: c.memorialId,
    memorialSlug: c.Memorial?.slug ?? '',
    memorialName: [c.Memorial?.firstname, c.Memorial?.lastname]
      .filter(Boolean)
      .join(' '),
    photoUrl: c.Photo?.url ?? '',
    caption: c.caption,
    status: c.status,
    videoUrl: c.videoUrl,
    errorMessage: c.errorMessage,
    creditCost: c.creditCost,
    createdAt: c.createdAt,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="space-y-1">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Animations Higgsfield
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Mes clips
        </h1>
        <p className="text-sm text-muted-foreground">
          Les clips se génèrent en 1-3 min. Cette page se rafraîchit
          automatiquement.
        </p>
      </header>

      <ClipsList initial={clips} />
    </div>
  );
}

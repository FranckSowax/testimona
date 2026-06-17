import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
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
  validatedAt: string | null;
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
       errorMessage, creditCost, validatedAt, createdAt,
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
    validatedAt: c.validatedAt,
  }));

  const awaitingCount = clips.filter(
    (c) => c.status === 'ready' && !c.validatedAt,
  ).length;

  return (
    <DashboardShell title="Mes clips">
      <div className="space-y-6">
        <p className="-mt-4 text-sm text-muted-foreground">
          Les clips se génèrent en 1-3 min. Valide-les pour qu'ils apparaissent
          dans le diaporama public du mémorial, ou regénère-les si le résultat
          ne te plaît pas (1 crédit par regénération). Tant qu'un clip n'a pas
          été validé ou refusé, il reste en attente ici.
        </p>

        {awaitingCount > 0 && (
          <p className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground/80">
            <span className="font-display font-bold text-foreground">
              {awaitingCount} clip{awaitingCount > 1 ? 's' : ''}
            </span>{' '}
            en attente de validation. Clique sur <strong>Valider</strong> pour
            chaque clip que tu veux publier dans le diaporama du mémorial.
          </p>
        )}

        <ClipsList clips={clips} />
      </div>
    </DashboardShell>
  );
}

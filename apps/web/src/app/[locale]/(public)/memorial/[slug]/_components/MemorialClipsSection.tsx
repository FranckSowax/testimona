import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  ClipsList,
  type ClipRowDto,
} from '@/app/[locale]/(dashboard)/dashboard/clips/ClipsList';

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
  Photo: { url: string } | null;
}

/**
 * Memorial-scoped clip manager. Lives inside the owner-only "Clips
 * animés" tab on the public memorial page so the family can find,
 * validate, regenerate and delete every clip generated for THIS
 * memorial in one place. Re-uses the cross-memorial ClipsList client
 * component for the actual rendering (status badges, validate /
 * regen / trash actions, auto-polling).
 */
export async function MemorialClipsSection({
  memorialId,
  memorialName,
  slug,
}: {
  memorialId: string;
  memorialName: string;
  slug: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('MemorialClip')
    .select(
      `id, memorialId, photoId, caption, status, videoUrl, durationMs,
       errorMessage, creditCost, validatedAt, createdAt,
       Photo:Photo!MemorialClip_photoId_fkey(url)`,
    )
    .eq('memorialId', memorialId)
    .order('createdAt', { ascending: false })
    .limit(80)
    .returns<RawClipRow[]>();

  const clips: ClipRowDto[] = (data ?? []).map((c) => ({
    id: c.id,
    memorialId: c.memorialId,
    memorialSlug: slug,
    memorialName,
    photoUrl: c.Photo?.url ?? '',
    caption: c.caption,
    status: c.status,
    videoUrl: c.videoUrl,
    errorMessage: c.errorMessage,
    creditCost: c.creditCost,
    createdAt: c.createdAt,
    validatedAt: c.validatedAt,
  }));

  const validatedCount = clips.filter((c) => c.validatedAt).length;
  const pendingCount = clips.filter(
    (c) => c.status === 'pending' || c.status === 'processing',
  ).length;
  const readyUnvalidatedCount = clips.filter(
    (c) => c.status === 'ready' && !c.validatedAt,
  ).length;

  return (
    <section aria-labelledby="memorial-clips-heading" className="space-y-6">
      <header className="space-y-2">
        <h2
          id="memorial-clips-heading"
          className="font-display text-2xl font-bold text-foreground"
        >
          Clips animés
        </h2>
        <p className="text-sm text-muted-foreground">
          Retrouve ici toutes les vidéos générées pour ce mémorial. Les clips
          validés apparaissent dans le diaporama public (déclenché par le
          bouton lecture sur la photo de couverture). Tu peux regénérer un
          clip si le résultat ne te plaît pas — chaque regénération coûte un
          crédit Testimona.
        </p>
      </header>

      {clips.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <Tile
            label="Validés"
            value={validatedCount}
            tone="ready"
          />
          <Tile
            label="À valider"
            value={readyUnvalidatedCount}
            tone={readyUnvalidatedCount > 0 ? 'accent' : 'neutral'}
          />
          <Tile
            label="En génération"
            value={pendingCount}
            tone={pendingCount > 0 ? 'processing' : 'neutral'}
          />
        </div>
      )}

      <ClipsList clips={clips} />

      {clips.length === 0 ? null : (
        <p className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
          Pour générer un nouveau clip, ouvre le bouton ✨ <strong>Animer les
          photos (IA)</strong> sur la photo de couverture du mémorial.
        </p>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ready' | 'accent' | 'processing' | 'neutral';
}) {
  const cls =
    tone === 'ready'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'accent'
      ? 'border-accent/30 bg-accent/5 text-accent'
      : tone === 'processing'
      ? 'border-primary/30 bg-primary/5 text-primary'
      : 'border-border bg-white text-foreground/60';
  return (
    <div className={['rounded-lg border p-3', cls].join(' ')}>
      <p className="font-display text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="tabular mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

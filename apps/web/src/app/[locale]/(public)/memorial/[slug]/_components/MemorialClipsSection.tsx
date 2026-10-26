import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ClipsList, type ClipRowDto } from '@/app/[locale]/(dashboard)/dashboard/clips/ClipsList';

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
  const t = await getTranslations('memorial.clipsSection');
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
  const readyUnvalidatedCount = clips.filter((c) => c.status === 'ready' && !c.validatedAt).length;

  return (
    <section aria-labelledby="memorial-clips-heading" className="space-y-6">
      <header className="space-y-2">
        <h2 id="memorial-clips-heading" className="font-display text-foreground text-2xl font-bold">
          {t('heading')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
      </header>

      {clips.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <Tile label={t('validated')} value={validatedCount} tone="ready" />
          <Tile
            label={t('toValidate')}
            value={readyUnvalidatedCount}
            tone={readyUnvalidatedCount > 0 ? 'accent' : 'neutral'}
          />
          <Tile
            label={t('generating')}
            value={pendingCount}
            tone={pendingCount > 0 ? 'processing' : 'neutral'}
          />
        </div>
      )}

      <ClipsList clips={clips} />

      {clips.length === 0 ? null : (
        <p className="border-accent/30 bg-accent/5 text-foreground/80 rounded-md border px-3 py-2 text-xs">
          {t.rich('footer', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
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
      <p className="tabular font-display mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

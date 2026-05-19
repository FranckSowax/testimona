import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin, getSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminShell } from '@/components/admin/AdminShell';
import { ClipAdminRow } from './ClipAdminRow';

export const dynamic = 'force-dynamic';

interface RawRow {
  id: string;
  memorialId: string;
  caption: string | null;
  status: string;
  videoUrl: string | null;
  higgsfieldJobId: string | null;
  errorMessage: string | null;
  creditCost: number;
  createdById: string;
  createdAt: string;
  Memorial: { slug: string; firstname: string; lastname: string } | null;
  Photo: { url: string } | null;
}

export default async function AdminClipsPage() {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('MemorialClip')
    .select(
      `id, memorialId, caption, status, videoUrl, higgsfieldJobId,
       errorMessage, creditCost, createdById, createdAt,
       Memorial:Memorial!MemorialClip_memorialId_fkey(slug, firstname, lastname),
       Photo:Photo!MemorialClip_photoId_fkey(url)`,
    )
    .order('createdAt', { ascending: false })
    .limit(200)
    .returns<RawRow[]>();

  const counts = {
    total: data?.length ?? 0,
    processing: (data ?? []).filter(
      (c) => c.status === 'pending' || c.status === 'processing',
    ).length,
    ready: (data ?? []).filter((c) => c.status === 'ready').length,
    failed: (data ?? []).filter((c) => c.status === 'failed').length,
  };

  return (
    <AdminShell title="Clips animés">
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total" value={counts.total} />
        <StatTile label="En cours" value={counts.processing} tone="processing" />
        <StatTile label="Prêts" value={counts.ready} tone="ready" />
        <StatTile label="Échoués" value={counts.failed} tone="failed" />
      </section>

      <p className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
        <span>
          Le worker tourne automatiquement quand un user a la page « Mes clips »
          ouverte. Pour pousser un cycle manuel, utilise{' '}
          <code className="rounded bg-muted px-1.5 py-0.5">POST /api/clips/poll</code>.
        </span>
        <a
          href="/admin/clips/ping"
          className="press-scale inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-muted"
        >
          Tester credentials
        </a>
      </p>

      {!data || data.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-10 text-center text-sm italic text-muted-foreground">
          Aucun clip généré encore.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-3">
              <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {c.Photo?.url && (
                  <Image
                    src={c.Photo.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/memorial/${c.Memorial?.slug}`}
                  className="block truncate font-display text-sm font-bold text-foreground hover:text-primary"
                >
                  {[c.Memorial?.firstname, c.Memorial?.lastname]
                    .filter(Boolean)
                    .join(' ')}
                </Link>
                {c.caption && (
                  <p className="line-clamp-1 text-xs italic text-muted-foreground">
                    {c.caption}
                  </p>
                )}
                <p
                  className="text-[10px] uppercase tracking-wide text-muted-foreground"
                  suppressHydrationWarning
                >
                  Job {c.higgsfieldJobId ? c.higgsfieldJobId.slice(0, 12) : '—'} ·{' '}
                  {new Date(c.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'Europe/Paris',
                  })}
                </p>
                {c.errorMessage && (
                  <p className="line-clamp-1 text-xs text-destructive">
                    {c.errorMessage}
                  </p>
                )}
              </div>
              <ClipAdminRow
                id={c.id}
                status={c.status}
                videoUrl={c.videoUrl}
              />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'processing' | 'ready' | 'failed';
}) {
  const toneCls =
    tone === 'processing'
      ? 'border-primary/30 bg-primary/5 text-primary'
      : tone === 'ready'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'failed'
      ? 'border-destructive/30 bg-destructive/5 text-destructive'
      : 'border-border bg-white text-foreground';
  return (
    <div
      className={[
        'rounded-lg border p-3',
        toneCls,
      ].join(' ')}
    >
      <p className="font-display text-[11px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="tabular mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

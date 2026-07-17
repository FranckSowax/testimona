import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { mapsEmbedSrc, mapsDirectionsHref } from '@/lib/geo/maps';
import { FuneralEventCreateModalShell } from './FuneralEventCreateModalShell';
import { FuneralEventDeleteButton } from './FuneralEventDeleteButton';
import { FuneralEventEditModalShell } from './FuneralEventEditModalShell';
import { FuneralEventShareButton } from './FuneralEventShareButton';

/** Split a stored "HH:MM – HH:MM" hour string back into start / end. */
function splitHour(hour: string | null): { startsAt: string; endsAt: string } {
  if (!hour) return { startsAt: '', endsAt: '' };
  const [start, end] = hour.split('–').map((s) => s.trim());
  return { startsAt: start ?? '', endsAt: end ?? '' };
}

interface FuneralEventRow {
  id: string;
  title: string;
  date: string | null;
  hour: string | null;
  url: string | null;
  note: string | null;
  location: string | null;
  address: string | null;
  position: number;
}

async function getFuneralEvents(memorialId: string): Promise<FuneralEventRow[]> {
  // Use the admin client so the owner reading their own (potentially
  // not-yet-published) memorial sees events regardless of RLS edge cases.
  // Visibility is still gated by isOwner / isPublic upstream.
  const supabase = getSupabaseAdminClient();
  const { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();
  if (!funeral) return [];
  // PDF p39 — events must be listed in chronological order (date, then
  // time), falling back to manual position when dates tie / are missing.
  const ordered = (columns: string) =>
    supabase
      .from('FuneralEvent')
      .select(columns)
      .eq('funeralId', funeral.id)
      .order('date', { ascending: true, nullsFirst: false })
      .order('hour', { ascending: true, nullsFirst: false })
      .order('position', { ascending: true });

  // url/note land via migration-v11; tolerate a DB that hasn't run it yet
  // so funeral events never vanish if the column is missing.
  const full = await ordered(
    'id, title, date, hour, url, note, location, address, position',
  ).returns<FuneralEventRow[]>();
  if (!full.error) return full.data ?? [];

  const fallback = await ordered(
    'id, title, date, hour, location, address, position',
  ).returns<Omit<FuneralEventRow, 'url' | 'note'>[]>();
  return (fallback.data ?? []).map((e) => ({ ...e, url: null, note: null }));
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  // Accept both "YYYY-MM-DD" and free-form strings.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  // Build the date from its calendar components (local) rather than parsing
  // the ISO string as UTC midnight — the latter, combined with a fixed
  // timezone, shifted the displayed day by one for some viewers. This keeps
  // the shown day exactly equal to the entered day.
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  try {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

export async function FuneralSection({
  memorialId,
  slug,
  isOwner = false,
}: {
  memorialId: string;
  slug?: string;
  isOwner?: boolean;
}) {
  const [events, t] = await Promise.all([
    getFuneralEvents(memorialId),
    getTranslations('memorial.funeralSection'),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const eventShareUrl = (eventId: string) =>
    slug ? `${siteUrl}/memorial/${slug}#funeral-event-${eventId}` : siteUrl;

  return (
    <section aria-labelledby="funeral-heading" className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2
            id="funeral-heading"
            className="font-display text-2xl font-bold text-foreground"
          >
            {t('heading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dates, lieux et plans d'accès des cérémonies.
          </p>
        </div>
        {isOwner && slug && (
          <FuneralEventCreateModalShell
            memorialId={memorialId}
            slug={slug}
            ctaLabel="Ajouter un événement"
          />
        )}
      </header>

      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center text-sm italic text-muted-foreground">
          {isOwner
            ? 'Aucun événement encore. Ajoute la veillée, la cérémonie et l\'inhumation pour que les proches puissent s\'y rendre.'
            : 'Les informations sur les funérailles seront publiées par la famille.'}
        </p>
      ) : (
        <ol className="space-y-5">
          {events.map((event, i) => {
            const formattedDate = formatDate(event.date);
            return (
              <li
                id={`funeral-event-${event.id}`}
                key={event.id}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]"
              >
                <div className="grid gap-0 sm:grid-cols-[1fr_320px]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Étape {i + 1}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FuneralEventShareButton
                          url={eventShareUrl(event.id)}
                          title={`${event.title} — ${t('heading')}`}
                        />
                        {isOwner && slug && (
                          <FuneralEventEditModalShell
                            id={event.id}
                            slug={slug}
                            initial={{
                              title: event.title,
                              date: event.date ?? '',
                              ...splitHour(event.hour),
                              url: event.url ?? '',
                              note: event.note ?? '',
                              location: event.location ?? '',
                              address: event.address ?? '',
                            }}
                          />
                        )}
                        {isOwner && slug && (
                          <FuneralEventDeleteButton id={event.id} slug={slug} />
                        )}
                      </div>
                    </div>
                    <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                      {event.title}
                    </h3>

                    <dl className="mt-4 space-y-2 text-sm">
                      {formattedDate && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Date
                          </dt>
                          <dd className="text-foreground">{formattedDate}</dd>
                        </div>
                      )}
                      {event.hour && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Heure
                          </dt>
                          <dd className="text-foreground">{event.hour}</dd>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Lieu
                          </dt>
                          <dd className="text-foreground">{event.location}</dd>
                        </div>
                      )}
                      {event.address && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Adresse
                          </dt>
                          <dd className="text-foreground">
                            {event.address}
                            <a
                              href={mapsDirectionsHref(event.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-block font-display text-xs font-bold text-primary hover:underline"
                            >
                              Itinéraire →
                            </a>
                          </dd>
                        </div>
                      )}
                      {event.url && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Lien
                          </dt>
                          <dd className="min-w-0 text-foreground">
                            <a
                              href={event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-display text-sm font-bold text-primary hover:underline"
                            >
                              {event.url}
                            </a>
                          </dd>
                        </div>
                      )}
                      {event.note && (
                        <div className="flex items-baseline gap-2">
                          <dt className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-16">
                            Note
                          </dt>
                          <dd className="whitespace-pre-line text-foreground">{event.note}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {event.address && mapsEmbedSrc(event.address) && (
                    <div className="relative min-h-[220px] border-t border-border sm:border-l sm:border-t-0">
                      <iframe
                        src={mapsEmbedSrc(event.address)}
                        title={`Carte ${event.title}`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

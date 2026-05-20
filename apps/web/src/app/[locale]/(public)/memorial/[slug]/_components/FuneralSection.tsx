import { getTranslations } from 'next-intl/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { FuneralEventCreateModalShell } from './FuneralEventCreateModalShell';
import { FuneralEventDeleteButton } from './FuneralEventDeleteButton';

interface FuneralEventRow {
  id: string;
  title: string;
  date: string | null;
  hour: string | null;
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
  const { data: events } = await supabase
    .from('FuneralEvent')
    .select('id, title, date, hour, location, address, position')
    .eq('funeralId', funeral.id)
    .order('position', { ascending: true })
    .returns<FuneralEventRow[]>();
  return events ?? [];
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  // Accept both "YYYY-MM-DD" and free-form strings.
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (!ymd.test(date)) return date;
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
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
                key={event.id}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]"
              >
                <div className="grid gap-0 sm:grid-cols-[1fr_320px]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Étape {i + 1}
                      </p>
                      {isOwner && slug && (
                        <FuneralEventDeleteButton id={event.id} slug={slug} />
                      )}
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
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-block font-display text-xs font-bold text-primary hover:underline"
                            >
                              Itinéraire →
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {event.address && (
                    <div className="relative min-h-[220px] border-t border-border sm:border-l sm:border-t-0">
                      <iframe
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address)}&output=embed`}
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

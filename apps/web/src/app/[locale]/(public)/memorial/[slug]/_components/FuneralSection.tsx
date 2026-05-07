import { getSupabaseServer } from '@/lib/supabase/server';

interface FuneralEventRow {
  id: string;
  title: string;
  date: string | null;
  hour: string | null;
  location: string | null;
  position: number;
}

async function getFuneralEvents(memorialId: string): Promise<FuneralEventRow[]> {
  const supabase = await getSupabaseServer();
  const { data: funeral } = await supabase
    .from('Funeral')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<{ id: string }>();
  if (!funeral) return [];
  const { data: events } = await supabase
    .from('FuneralEvent')
    .select('id, title, date, hour, location, position')
    .eq('funeralId', funeral.id)
    .order('position', { ascending: true })
    .returns<FuneralEventRow[]>();
  return events ?? [];
}

export async function FuneralSection({ memorialId }: { memorialId: string }) {
  const events = await getFuneralEvents(memorialId);

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
        Les informations sur les funérailles seront publiées par les proches.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-lg border border-border bg-white p-5 shadow-sm"
        >
          <p className="font-display text-lg font-semibold text-foreground">{event.title}</p>
          <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            {event.date && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground/60">Date</dt>
                <dd>{event.date}</dd>
              </div>
            )}
            {event.hour && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground/60">Heure</dt>
                <dd>{event.hour}</dd>
              </div>
            )}
            {event.location && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground/60">Lieu</dt>
                <dd>{event.location}</dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ol>
  );
}

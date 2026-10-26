import type { ReactNode } from 'react';

interface EventCardProps {
  title: string;
  authorName: string;
  postedDate: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
  url?: string;
  note?: string;
  address?: string;
  mapEmbedUrl?: string;
  trailing?: ReactNode;
  className?: string;
}

interface RowProps {
  label: string;
  children: ReactNode;
}
function Row({ label, children }: RowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
      <dt className="font-display text-foreground/70 font-semibold">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

/**
 * V2 EventCard (Funerals) : title + Date / Starts / Ends / URL / Note / Address + map embed.
 */
export function EventCard({
  title,
  authorName,
  postedDate,
  date,
  startsAt,
  endsAt,
  url,
  note,
  address,
  mapEmbedUrl,
  trailing,
  className,
}: EventCardProps) {
  return (
    <article
      className={[
        'border-border flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-[var(--shadow-card)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-foreground text-lg font-bold">{title}</h3>
          <p className="text-muted-foreground tabular mt-0.5 text-xs italic">
            Posted on {postedDate} by{' '}
            <span className="font-display text-foreground font-semibold not-italic">
              {authorName}
            </span>
          </p>
        </div>
        {trailing && <div className="flex items-center gap-1">{trailing}</div>}
      </header>

      <dl className="space-y-2">
        {date && <Row label="Date">{date}</Row>}
        {startsAt && <Row label="Starts">{startsAt}</Row>}
        {endsAt && <Row label="Ends">{endsAt}</Row>}
        {url && (
          <Row label="URL">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {url}
            </a>
          </Row>
        )}
        {note && <Row label="Note">{note}</Row>}
        {address && <Row label="Address">{address}</Row>}
      </dl>

      {mapEmbedUrl && (
        <div className="border-border overflow-hidden rounded-md border">
          <iframe
            src={mapEmbedUrl}
            title={`Map: ${title}`}
            className="h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </article>
  );
}
